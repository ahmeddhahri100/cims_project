const speakeasy = require('speakeasy');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'n8n',
  user: process.env.POSTGRES_USER || 'n8n',
  password: process.env.POSTGRES_PASSWORD || 'n8npassword',
});

const APP_NAME = 'VOC Platform';

async function generateSecret(userId) {
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${userId})`,
    issuer: APP_NAME,
  });

  await pool.query(
    `INSERT INTO voc.totp_secrets (user_id, secret, verified)
     VALUES ($1, $2, FALSE)
     ON CONFLICT (user_id) DO UPDATE SET secret = $2, verified = FALSE`,
    [userId, secret.base32]
  );

  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

async function getSecret(userId) {
  const result = await pool.query(
    'SELECT secret, verified FROM voc.totp_secrets WHERE user_id = $1',
    [userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

async function verifyCode(userId, token) {
  const row = await getSecret(userId);
  if (!row) return null;

  const verified = speakeasy.totp.verify({
    secret: row.secret,
    encoding: 'base32',
    token: token,
    window: 1,
  });

  return verified;
}

async function markVerified(userId) {
  await pool.query(
    'UPDATE voc.totp_secrets SET verified = TRUE WHERE user_id = $1',
    [userId]
  );
}

async function isTotpEnabled(userId) {
  const row = await getSecret(userId);
  return row && row.verified;
}

async function disableTotp(userId) {
  await pool.query('DELETE FROM voc.totp_secrets WHERE user_id = $1', [userId]);
}

module.exports = {
  generateSecret,
  getSecret,
  verifyCode,
  markVerified,
  isTotpEnabled,
  disableTotp,
};
