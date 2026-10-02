const router = require('express').Router();
const QRCode = require('qrcode');
const totpService = require('../services/totp');

router.post('/setup', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const { secret, otpauth_url } = await totpService.generateSecret(userId);
    const qrCode = await QRCode.toDataURL(otpauth_url);

    res.json({
      secret,
      qr_code: qrCode,
      otpauth_url,
    });
  } catch (error) {
    console.error('[TOTP] Setup error:', error);
    res.status(500).json({ error: 'Failed to generate TOTP secret' });
  }
});

router.post('/verify', async (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: 'userId and token are required' });
  }

  try {
    const valid = await totpService.verifyCode(userId, token);
    if (valid === null) {
      return res.status(404).json({ error: 'TOTP not set up for this user' });
    }

    if (valid) {
      await totpService.markVerified(userId);
      return res.json({ success: true, message: 'TOTP verified successfully' });
    }

    res.status(401).json({ error: 'Invalid code. Try again.' });
  } catch (error) {
    console.error('[TOTP] Verify error:', error);
    res.status(500).json({ error: 'Failed to verify TOTP code' });
  }
});

router.get('/status', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const enabled = await totpService.isTotpEnabled(userId);
    res.json({ enabled });
  } catch (error) {
    console.error('[TOTP] Status error:', error);
    res.status(500).json({ error: 'Failed to check TOTP status' });
  }
});

router.delete('/disable', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    await totpService.disableTotp(userId);
    res.json({ success: true, message: 'TOTP disabled' });
  } catch (error) {
    console.error('[TOTP] Disable error:', error);
    res.status(500).json({ error: 'Failed to disable TOTP' });
  }
});

module.exports = router;
