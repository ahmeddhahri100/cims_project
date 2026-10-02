import { useState, useEffect } from 'react';
import { Sun, Moon, KeyRound, LogIn, Shield, Smartphone, CheckCircle, AlertCircle, RefreshCw, ScanLine } from 'lucide-react';
import { getLoginUrl, ensureValidToken, storeTokens } from '../keycloak.js';
import { useTheme } from '../ThemeContext.jsx';
import { useNavigate } from 'react-router-dom';

const API_AUTH = '/api/v1/auth/login';
const API_TOTP_SETUP = '/api/v1/totp/setup';
const API_TOTP_VERIFY = '/api/v1/totp/verify';

function Login() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [step, setStep] = useState('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [userId, setUserId] = useState(null);

  const [qrCode, setQrCode] = useState(null);
  const [qrSecret, setQrSecret] = useState(null);
  const [qrToken, setQrToken] = useState('');

  useEffect(() => {
    (async () => {
      if (await ensureValidToken()) {
        navigate('/', { replace: true });
      }
    })();
  }, [navigate]);

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setMessage({ type: 'error', text: 'Username and password are required' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch(API_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();

      if (d.access_token) {
        storeTokens(d.access_token, d.refresh_token, d.id_token);
        setTokenData(d);
        setUserId(d.user?.sub);
        if (d.totp_enabled) {
          setStep('done');
          navigate('/', { replace: true });
        } else {
          setStep('totp-optional');
        }
      } else if (d.otp_required) {
        setUserId(d.user?.sub);
        setStep('totp-input');
        setMessage(null);
      } else if (d.otp_setup_required) {
        setStep('totp-setup-prompt');
        setMessage({ type: 'info', text: d.error || 'Two-factor authentication is required. Set it up below.' });
      } else {
        setMessage({ type: 'error', text: d.error || 'Invalid credentials' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error. Is the backend running on port 8000?' });
    }
    setLoading(false);
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    if (!totpCode || totpCode.length < 6) {
      setMessage({ type: 'error', text: 'Enter the 6-digit code from Google Authenticator' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch(API_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, totp: totpCode }),
      });
      const d = await r.json();

      if (d.access_token) {
        storeTokens(d.access_token, d.refresh_token, d.id_token);
        setTokenData(d);
        setStep('done');
        navigate('/', { replace: true });
      } else if (d.otp_invalid) {
        setMessage({ type: 'error', text: 'Invalid Google Authenticator code. Try again.' });
        setTotpCode('');
      } else {
        setMessage({ type: 'error', text: d.error || 'Authentication failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    }
    setLoading(false);
  };

  const handleSetupTotp = async () => {
    if (!userId) {
      setMessage({ type: 'error', text: 'User ID not available. Sign in with Keycloak first.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch(API_TOTP_SETUP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const d = await r.json();
      if (d.qr_code) {
        setQrCode(d.qr_code);
        setQrSecret(d.secret);
        setStep('totp-qr');
      } else {
        setMessage({ type: 'error', text: d.error || 'Failed to generate QR code' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    }
    setLoading(false);
  };

  const handleQrVerify = async (e) => {
    e.preventDefault();
    if (!qrToken || qrToken.length < 6) {
      setMessage({ type: 'error', text: 'Enter the 6-digit code from Google Authenticator' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch(API_TOTP_VERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: qrToken }),
      });
      const d = await r.json();
      if (d.success) {
        setStep('done');
        navigate('/', { replace: true });
      } else {
        setMessage({ type: 'error', text: d.error || 'Verification failed. Try again.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    }
    setLoading(false);
  };

  const resetForm = () => {
    setStep('credentials');
    setUsername('');
    setPassword('');
    setTotpCode('');
    setQrCode(null);
    setQrSecret(null);
    setQrToken('');
    setMessage(null);
    setTokenData(null);
    setUserId(null);
  };

  const themeBtn = (
    <button onClick={toggleTheme} style={{
      position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 50,
      padding: '0.75rem', background: 'var(--bg-secondary)',
      border: '1px solid var(--border)', borderRadius: '0.75rem',
      color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.85rem',
      display: 'flex', alignItems: 'center', gap: '8px',
      transition: 'all 0.2s',
    }}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );

  const msgBox = message && (
    <div style={{
      marginTop: '1rem', padding: '0.65rem 0.85rem', borderRadius: '0.5rem',
      fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px',
      background: message.type === 'error'
        ? 'rgba(239,68,68,0.15)'
        : message.type === 'success'
          ? 'rgba(16,185,129,0.15)'
          : 'rgba(59,130,246,0.15)',
      color: message.type === 'error'
        ? '#ef4444'
        : message.type === 'success'
          ? '#10b981'
          : '#3b82f6',
    }}>
      {message.type === 'error' ? <AlertCircle size={14} /> :
       message.type === 'success' ? <CheckCircle size={14} /> :
       <AlertCircle size={14} />}
      {message.text}
    </div>
  );

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative',
    }}>
      {themeBtn}

      <div style={{
        background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '1rem',
        width: '420px', maxWidth: '92vw', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        border: '1px solid var(--border)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
          }}>
            <Shield size={28} color="#fff" />
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            <span style={{ color: 'var(--accent)' }}>VOC</span> Platform
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Real-time Monitoring + AI Analysis
          </p>
        </div>

        {/* ─── STEP: Credentials Form ─── */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Username
              </label>
              <input
                type="text" value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-input)',
                  borderRadius: '0.5rem', color: 'var(--text-primary)',
                  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Password
              </label>
              <input
                type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  background: 'var(--bg-primary)', border: '1px solid var(--border-input)',
                  borderRadius: '0.5rem', color: 'var(--text-primary)',
                  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '0.85rem',
                background: loading
                  ? 'var(--bg-secondary)'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                border: `1px solid ${loading ? 'var(--border)' : 'rgba(99,102,241,0.35)'}`,
                borderRadius: '0.5rem',
                color: loading ? 'var(--text-muted)' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(79,70,229,0.35)',
              }}>
              {loading ? <RefreshCw size={18} className="lucide-spin" /> : <LogIn size={18} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {msgBox}

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              margin: '1.5rem 0', color: 'var(--text-muted-2)', fontSize: '0.78rem',
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            {/* Keycloak SSO */}
            <button type="button" onClick={() => { window.location.href = getLoginUrl(); }}
              style={{
                width: '100%', padding: '0.85rem',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                color: 'var(--text-primary)',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <KeyRound size={18} /> Sign in with Keycloak
            </button>
          </form>
        )}

        {/* ─── STEP: TOTP Input (second factor) ─── */}
        {step === 'totp-input' && (
          <form onSubmit={handleTotpSubmit}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <Smartphone size={40} color="var(--accent)" style={{ marginBottom: '0.75rem' }} />
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
                Two-Factor Authentication
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                Enter the 6-digit code from Google Authenticator
              </p>
            </div>

            <input
              type="text" inputMode="numeric"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
              maxLength={6}
              style={{
                width: '100%', padding: '0.85rem',
                background: 'var(--bg-primary)', border: '2px solid var(--accent)',
                borderRadius: '0.5rem', color: 'var(--text-primary)',
                fontSize: '1.5rem', letterSpacing: '0.5em', textAlign: 'center',
                outline: 'none', boxSizing: 'border-box', marginBottom: '1rem',
              }}
            />

            <button type="submit" disabled={loading || totpCode.length < 6}
              style={{
                width: '100%', padding: '0.85rem',
                background: loading || totpCode.length < 6
                  ? 'var(--bg-secondary)'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                border: 'none', borderRadius: '0.5rem',
                color: loading || totpCode.length < 6 ? 'var(--text-muted)' : '#fff',
                cursor: loading || totpCode.length < 6 ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: '0.9rem',
              }}>
              {loading ? <RefreshCw size={18} className="lucide-spin" /> : 'Verify & Sign In'}
            </button>

            {msgBox}

            <button type="button" onClick={resetForm}
              style={{
                marginTop: '1rem', width: '100%', padding: '0.65rem',
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: '0.5rem', color: 'var(--text-muted-2)', cursor: 'pointer', fontSize: '0.82rem',
              }}>
              Back to login
            </button>
          </form>
        )}

        {/* ─── STEP: TOTP Setup Prompt ─── */}
        {step === 'totp-setup-prompt' && (
          <div style={{ textAlign: 'center' }}>
            <Shield size={44} color="var(--accent)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              Set Up Two-Factor Authentication
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your account requires Google Authenticator. You can set it up now or sign in with Keycloak.
            </p>

            <button onClick={handleSetupTotp} disabled={loading}
              style={{
                width: '100%', padding: '0.85rem',
                background: loading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                border: 'none', borderRadius: '0.5rem',
                color: loading ? 'var(--text-muted)' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginBottom: '0.75rem',
              }}>
              {loading ? <RefreshCw size={18} className="lucide-spin" /> : <Smartphone size={18} />}
              Set Up Google Authenticator
            </button>

            <button onClick={() => { window.location.href = getLoginUrl(); }}
              style={{
                width: '100%', padding: '0.75rem',
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: '0.5rem', color: 'var(--text-primary)', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
              <KeyRound size={16} /> Sign in with Keycloak to configure
            </button>

            {msgBox}

            <button type="button" onClick={resetForm}
              style={{
                marginTop: '1rem', padding: '0.65rem',
                background: 'transparent', border: 'none',
                color: 'var(--text-muted-2)', cursor: 'pointer', fontSize: '0.82rem',
              }}>
              Back to login
            </button>
          </div>
        )}

        {/* ─── STEP: QR Code Scan ─── */}
        {step === 'totp-qr' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <ScanLine size={36} color="var(--accent)" style={{ marginBottom: '0.5rem' }} />
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
                Scan QR Code
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                Open <strong>Google Authenticator</strong> → tap <strong>+</strong> → <strong>Scan QR code</strong>
              </p>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'center', marginBottom: '1rem',
            }}>
              <img src={qrCode} alt="TOTP QR Code"
                style={{
                  width: 200, height: 200, borderRadius: '0.5rem',
                  background: '#fff', padding: '0.5rem',
                }}
              />
            </div>

            <div style={{
              textAlign: 'center', marginBottom: '1.25rem',
              color: 'var(--text-muted-2)', fontSize: '0.75rem',
            }}>
              <p style={{ margin: '0 0 0.25rem' }}>Or enter this key manually:</p>
              <code style={{
                fontSize: '0.8rem', color: 'var(--accent)',
                background: 'var(--hover-overlay)', padding: '0.25rem 0.75rem',
                borderRadius: '0.25rem', wordBreak: 'break-all',
              }}>{qrSecret}</code>
            </div>

            <form onSubmit={handleQrVerify}>
              <input
                type="text" inputMode="numeric"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                maxLength={6}
                style={{
                  width: '100%', padding: '0.85rem',
                  background: 'var(--bg-primary)', border: '2px solid var(--accent)',
                  borderRadius: '0.5rem', color: 'var(--text-primary)',
                  fontSize: '1.5rem', letterSpacing: '0.5em', textAlign: 'center',
                  outline: 'none', boxSizing: 'border-box', marginBottom: '1rem',
                }}
              />

              <button type="submit" disabled={loading || qrToken.length < 6}
                style={{
                  width: '100%', padding: '0.85rem',
                  background: loading || qrToken.length < 6
                    ? 'var(--bg-secondary)'
                    : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  border: 'none', borderRadius: '0.5rem',
                  color: loading || qrToken.length < 6 ? 'var(--text-muted)' : '#fff',
                  cursor: loading || qrToken.length < 6 ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                {loading ? <RefreshCw size={18} className="lucide-spin" /> : <CheckCircle size={18} />}
                Verify & Complete Setup
              </button>
            </form>

            {msgBox}

            <button type="button" onClick={resetForm}
              style={{
                marginTop: '1rem', width: '100%', padding: '0.65rem',
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: '0.5rem', color: 'var(--text-muted-2)', cursor: 'pointer', fontSize: '0.82rem',
              }}>
              Cancel
            </button>
          </div>
        )}

        {/* ─── STEP: TOTP Optional (logged in, no TOTP configured) ─── */}
        {step === 'totp-optional' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={44} color="#10b981" style={{ marginBottom: '1rem' }} />
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              Signed In Successfully
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Two-factor authentication is not configured. Would you like to add an extra layer of security?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { navigate('/', { replace: true }); }}
                style={{
                  flex: 1, padding: '0.75rem',
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: '0.5rem', color: 'var(--text-muted)', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.85rem',
                }}>
                Skip
              </button>
              <button onClick={handleSetupTotp} disabled={loading}
                style={{
                  flex: 1, padding: '0.75rem',
                  background: loading ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  border: 'none', borderRadius: '0.5rem',
                  color: loading ? 'var(--text-muted)' : '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                {loading ? <RefreshCw size={16} className="lucide-spin" /> : <Shield size={16} />}
                Set Up Now
              </button>
            </div>

            {msgBox}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
