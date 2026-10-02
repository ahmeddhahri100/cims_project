const router = require('express').Router();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'n8n',
  user: process.env.POSTGRES_USER || 'n8n',
  password: process.env.POSTGRES_PASSWORD || 'n8npassword',
});

const initConfigTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_by VARCHAR(100),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS gmail_recipient_history (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        changed_by VARCHAR(100),
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('[CONFIG] Tables initialized');
  } catch (err) {
    console.error('[CONFIG] Init error:', err.message);
  }
};

setTimeout(() => initConfigTable(), 1500);

// GET current gmail recipient
router.get('/gmail-recipient', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT value FROM app_config WHERE key = 'gmail_recipient'`
    );
    const email = result.rows.length > 0 ? result.rows[0].value : '';
    return res.json({ email });
  } catch (err) {
    console.error('[CONFIG] GET error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// PUT update gmail recipient
router.put('/gmail-recipient', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const username = req.user?.preferred_username || req.user?.email || 'unknown';

    // Get old value before overwriting
    const old = await pool.query(
      `SELECT value FROM app_config WHERE key = 'gmail_recipient'`
    );
    const oldEmail = old.rows.length > 0 ? old.rows[0].value : null;

    // Upsert current
    await pool.query(
      `INSERT INTO app_config (key, value, updated_by, updated_at)
       VALUES ('gmail_recipient', $1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()`,
      [email, username]
    );

    // Archive old email if it changed
    if (oldEmail && oldEmail !== email) {
      await pool.query(
        `INSERT INTO gmail_recipient_history (email, changed_by) VALUES ($1, $2)`,
        [oldEmail, username]
      );
    }

    return res.json({ email, message: 'Recipient updated' });
  } catch (err) {
    console.error('[CONFIG] PUT error:', err.message);
    return res.status(500).json({ error: 'Failed to update config' });
  }
});

// GET history of past recipients
router.get('/gmail-recipient/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT email, changed_by, changed_at
       FROM gmail_recipient_history
       ORDER BY changed_at DESC
       LIMIT 20`
    );
    return res.json({ history: result.rows });
  } catch (err) {
    console.error('[CONFIG] History error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
