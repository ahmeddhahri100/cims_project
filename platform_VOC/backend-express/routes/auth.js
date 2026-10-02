const axios = require('axios');
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'platform-voc';
const CLIENT_ID = process.env.CLIENT_ID || 'platform-voc-client';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const KC_ADMIN_USER = process.env.KC_ADMIN_USER;
const KC_ADMIN_PASSWORD = process.env.KC_ADMIN_PASSWORD;
const totpService = require('../services/totp');

const REQUIRED_ENV = ['CLIENT_SECRET', 'KC_ADMIN_USER', 'KC_ADMIN_PASSWORD'];
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(', ')}. ` +
      'Copy .env.example to .env and fill them in.'
  );
}

const client = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256'],
      issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
    }, (err, decoded) => {
      if (err) {
        console.error('[AUTH] Token verification failed:', err.message);
        return reject(err);
      }
      resolve(decoded);
    });
  });
}

router.get('/login', (req, res) => {
    const authUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth` +
        `?client_id=${CLIENT_ID}` +
        `&redirect_uri=${FRONTEND_URL}/callback` +
        `&response_type=code` +
        `&scope=openid+profile+email`;

    res.json({ login_url: authUrl });
});

router.post('/login', async (req, res) => {
    const { username, password, totp } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            error: 'Username and password are required'
        });
    }

    try {
        const tokenUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('username', username);
        params.append('password', password);

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 30000,
            validateStatus: (status) => status >= 200 && status < 300
        });

        const tokenData = response.data;

        const payload = await verifyToken(tokenData.access_token);
        const userId = payload.sub;

        const totpEnabled = await totpService.isTotpEnabled(userId);
        if (totpEnabled) {
            if (!totp) {
                return res.status(401).json({
                    error: 'One-time code required from Google Authenticator',
                    otp_required: true,
                    user: { sub: userId }
                });
            }
            const valid = await totpService.verifyCode(userId, totp);
            if (!valid) {
                return res.status(401).json({
                    error: 'Invalid Google Authenticator code',
                    otp_invalid: true
                });
            }
        }

        const userInfo = {
            sub: payload.sub,
            email: payload.email,
            username: payload.preferred_username,
            firstName: payload.given_name,
            lastName: payload.family_name,
            roles: payload.realm_access?.roles || []
        };

        res.json({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            id_token: tokenData.id_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type,
            user: userInfo,
            totp_enabled: totpEnabled
        });
    } catch (error) {
        const errorData = error.response?.data || {};
        const errorDesc = (errorData.error_description || '').toLowerCase();

        if (error.response?.status === 401 || error.response?.status === 400) {
            if (errorDesc.includes('account is not fully set up')) {
                return res.status(401).json({
                    error: 'Set up two-factor authentication first. Use "Sign in with Keycloak" to configure Google Authenticator.',
                    otp_setup_required: true
                });
            }

            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Login failed. Is the backend running?' });
    }
});

router.post('/callback', async (req, res) => {
    const { code, redirect_uri } = req.body;
    if (!code) return res.status(400).json({ error: 'Authorization code required' });

    try {
        const tokenUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('code', code);
        params.append('redirect_uri', redirect_uri || `${FRONTEND_URL}/callback`);

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 30000,
            validateStatus: (status) => status >= 200 && status < 300,
        });

        const tokenData = response.data;
        const payload = await verifyToken(tokenData.access_token);
        const userId = payload.sub;
        const totpEnabled = await totpService.isTotpEnabled(userId);

        const userInfo = {
            sub: payload.sub,
            email: payload.email,
            username: payload.preferred_username,
            firstName: payload.given_name,
            lastName: payload.family_name,
            roles: payload.realm_access?.roles || []
        };

        res.json({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            id_token: tokenData.id_token,
            expires_in: tokenData.expires_in,
            token_type: tokenData.token_type,
            user: userInfo,
            totp_enabled: totpEnabled,
        });
    } catch (error) {
        const errData = error.response?.data || {};
        console.error('[AUTH] Callback error:', error.message, JSON.stringify(errData));
        res.status(500).json({ error: 'Token exchange failed', detail: errData.error_description || error.message });
    }
});

router.get('/logout', (req, res) => {
    const idTokenHint = req.query.id_token_hint || '';
    // Keycloak requires client_id OR a valid id_token_hint when post_logout_redirect_uri is used.
    // Passing an empty/invalid id_token_hint makes Keycloak return 400 and keeps the SSO session alive.
    let logoutUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout` +
        `?client_id=${CLIENT_ID}` +
        `&post_logout_redirect_uri=${encodeURIComponent(FRONTEND_URL)}`;
    if (idTokenHint) {
        logoutUrl += `&id_token_hint=${idTokenHint}`;
    }

    req.session?.destroy();
    res.json({ logout_url: logoutUrl });
});

router.get('/status', async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({
            authenticated: false,
            user: null,
            roles: []
        });
    }

    const token = authHeader.substring(7);

    try {
        const payload = await verifyToken(token);
        const roles = payload.realm_access?.roles || [];

        res.json({
            authenticated: true,
            user: {
                sub: payload.sub,
                email: payload.email,
                username: payload.preferred_username,
                firstName: payload.given_name,
                lastName: payload.family_name
            },
            roles: roles.filter(r => r !== 'offline_access')
        });
    } catch {
        res.json({ authenticated: false, user: null, roles: [] });
    }
});

module.exports = router;
