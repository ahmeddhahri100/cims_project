const KEYCLOAK_CONFIG = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'platform-voc',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'platform-voc-client',
};

const CLIENT_SECRET = import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET || '';
const FRONTEND_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
const MIN_TOKEN_LIFETIME = 30;

function b64decode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

function parseToken(token) {
  try {
    return JSON.parse(b64decode(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function getLoginUrl() {
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CONFIG.clientId,
    redirect_uri: `${FRONTEND_URL}/callback`,
    response_type: 'code',
    scope: 'openid profile email',
  });
  return `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/auth?${params}`;
}

export function getLogoutUrl() {
  const params = new URLSearchParams({
    redirect_uri: FRONTEND_URL,
  });
  return `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/logout?${params}`;
}

export function storeTokens(accessToken, refreshToken, idToken) {
  localStorage.setItem('voc_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('voc_refresh_token', refreshToken);
  }
  if (idToken) {
    localStorage.setItem('voc_id_token', idToken);
  }
}

export function clearTokens() {
  localStorage.removeItem('voc_token');
  localStorage.removeItem('voc_refresh_token');
  localStorage.removeItem('voc_id_token');
}

export function getIdToken() {
  return localStorage.getItem('voc_id_token');
}

export function getToken() {
  return localStorage.getItem('voc_token');
}

export function getRefreshToken() {
  return localStorage.getItem('voc_refresh_token');
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(
      `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: KEYCLOAK_CONFIG.clientId,
          client_secret: CLIENT_SECRET,
          refresh_token: refreshToken,
        }),
      }
    );
    const data = await response.json();
    if (data.access_token) {
      storeTokens(data.access_token, data.refresh_token || refreshToken, data.id_token || undefined);
      return data.access_token;
    }
    clearTokens();
    return null;
  } catch {
    clearTokens();
    return null;
  }
}

export async function ensureValidToken() {
  const token = getToken();
  if (!token) return false;

  const payload = parseToken(token);
  if (!payload) {
    const newToken = await refreshAccessToken();
    return !!newToken;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;

  if (expiresIn < 0 || expiresIn < MIN_TOKEN_LIFETIME) {
    const newToken = await refreshAccessToken();
    return !!newToken;
  }

  return true;
}

export function getUserInfo() {
  const token = getToken();
  if (!token) return null;

  const payload = parseToken(token);
  if (!payload) return null;

  return {
    sub: payload.sub,
    email: payload.email,
    preferred_username: payload.preferred_username,
    roles: payload.realm_access?.roles || [],
  };
}

export async function getUserInfoAsync() {
  const valid = await ensureValidToken();
  if (!valid) return null;
  return getUserInfo();
}

export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;

  const payload = parseToken(token);
  if (!payload) return false;

  return true;
}

export function logout() {
  clearTokens();
}

export async function performKeycloakLogout() {
  const idToken = getIdToken();
  const payload = idToken ? parseToken(idToken) : null;
  const expOk = payload && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  const qs = expOk ? `?id_token_hint=${encodeURIComponent(idToken)}` : '';
  try {
    const r = await fetch(`/api/v1/auth/logout${qs}`, { credentials: 'include' });
    const d = await r.json();
    clearTokens();
    if (d.logout_url) {
      window.location.href = d.logout_url;
      return;
    }
  } catch {
    clearTokens();
  }
  window.location.href = `${FRONTEND_URL}/login`;
}
