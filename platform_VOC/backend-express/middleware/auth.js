const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'platform-voc';
const CLIENT_ID = process.env.CLIENT_ID || 'platform-voc-client';

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
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', authenticated: false });
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyToken(token);
    req.user = {
      sub: payload.sub,
      email: payload.email,
      preferred_username: payload.preferred_username,
      given_name: payload.given_name,
      family_name: payload.family_name,
      realm_access: payload.realm_access,
    };
    req.token = token;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: message, authenticated: false });
  }
}

module.exports = authMiddleware;
