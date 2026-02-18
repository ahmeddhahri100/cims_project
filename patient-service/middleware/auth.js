const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

async function verifyToken(token) {
  try {
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/verify`,
      {},
      {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error('Service auth indisponible');
    }
    throw new Error('Token invalide');
  }
}

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token requis' });
    }

    try {
      const data = await verifyToken(token);
      
      if (!data.valid) {
        return res.status(401).json({ error: 'Token invalide' });
      }
      
      req.user = data.user;
      
      if (!allowedRoles.includes(data.user.role)) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
      
      next();
    } catch (err) {
      console.error('[Auth Middleware]', err.message);
      if (err.message === 'Service auth indisponible') {
        return res.status(503).json({ error: 'Service auth indisponible' });
      }
      return res.status(401).json({ error: err.message });
    }
  };
}

// Middleware pour authentifier sans vérifier le rôle
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }

  try {
    const data = await verifyToken(token);
    
    if (!data.valid) {
      return res.status(401).json({ error: 'Token invalide' });
    }
    
    req.user = data.user;
    next();
  } catch (err) {
    console.error('[Auth Middleware]', err.message);
    return res.status(401).json({ error: err.message });
  }
}

module.exports = { requireRole, authenticate };
