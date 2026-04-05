const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('./db');

const router = express.Router();

// ─── POST /api/auth/register ────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'patient' } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Champs requis : email, password, firstName, lastName' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    // Email déjà utilisé ?
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hash + insertion
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, hash, firstName, lastName, role]
    );

    const user  = result.rows[0];
    const token = makeToken(user);

    return res.status(201).json({
      message: 'Compte créé avec succès',
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role },
      token
    });
  } catch (err) {
    console.error('[register]', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user   = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Mettre à jour last_login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = makeToken(user);

    return res.json({
      message: 'Connexion réussie',
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role },
      token
    });
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/auth/verify ──────────────────────────────────────
// Utilisé par patient-service et rdv-service pour valider un token
router.post('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ valid: false, error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ valid: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ valid: false, error: 'Token invalide ou expiré' });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result  = await pool.query(
      'SELECT id, email, first_name, last_name, role, created_at, last_login FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
    return res.json(result.rows[0]);
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
});

// ─── Helper ─────────────────────────────────────────────────────
function makeToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = router;
