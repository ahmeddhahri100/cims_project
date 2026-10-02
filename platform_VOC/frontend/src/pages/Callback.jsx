import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeTokens } from '../keycloak.js';
import { Shield, CheckCircle, AlertCircle, RefreshCw, Smartphone, ScanLine } from 'lucide-react';

function Callback() {
  const navigate = useNavigate();
  const [step, setStep] = useState('exchanging');
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [totpEnabled, setTotpEnabled] = useState(false);

  const [qrCode, setQrCode] = useState(null);
  const [qrSecret, setQrSecret] = useState(null);
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');

    if (sessionStorage.getItem('kc_cb') === code) return;
    if (code) sessionStorage.setItem('kc_cb', code);

    if (errorParam) {
      setError(errorDescription || errorParam);
      setStatus('Authentication failed');
      return;
    }

    if (code) {
      setStatus('Exchanging code for token...');

      fetch('/api/v1/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirect_uri: `${window.location.origin}/callback`,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.access_token) {
            storeTokens(data.access_token, data.refresh_token, data.id_token);
            setUserId(data.user?.sub);
            setTotpEnabled(!!data.totp_enabled);

            if (!data.totp_enabled) {
              setStep('totp-optional');
              setStatus('Signed in successfully');
            } else {
              setStatus('Token received! Redirecting...');
              setTimeout(() => { navigate('/', { replace: true }); }, 1000);
            }
          } else {
            setError(data.error || 'Token exchange failed');
            setStatus('Login failed');
          }
        })
        .catch((err) => {
          console.error('Token exchange error:', err);
          setError(err.message);
          setStatus('Token exchange failed');
        });
    } else {
      setError('No authorization code received');
      setStatus('Redirecting to home...');
      setTimeout(() => { navigate('/', { replace: true }); }, 2000);
    }
  }, []);

  const handleSetupTotp = async () => {
    if (!userId) return;
    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch('/api/v1/totp/setup', {
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
      const r = await fetch('/api/v1/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: qrToken }),
      });
      const d = await r.json();
      if (d.success) {
        setStep('done');
        setTimeout(() => { navigate('/', { replace: true }); }, 1000);
      } else {
        setMessage({ type: 'error', text: d.error || 'Verification failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    }
    setLoading(false);
  };

  const msgBox = message && (
    <div style={{
      marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
      fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px',
      background: message.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
      color: message.type === 'error' ? '#ef4444' : '#10b981',
    }}>
      {message.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
      {message.text}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', color: 'var(--text-primary)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: 'var(--bg-secondary)', padding: '2.5rem', borderRadius: '1rem',
        width: '420px', maxWidth: '92vw', textAlign: 'center',
        border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        {/* Exchanging step */}
        {step === 'exchanging' && (
          <div>
            <RefreshCw size={40} className="lucide-spin" style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{status}</h2>
            {error && (
              <div style={{
                marginTop: '1rem', padding: '0.75rem', borderRadius: '0.5rem',
                background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.85rem',
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}
            <button onClick={() => navigate('/', { replace: true })}
              style={{
                marginTop: '1.5rem', padding: '0.75rem 2rem',
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: 'white', border: 'none', borderRadius: '0.5rem',
                cursor: 'pointer', fontWeight: 600,
              }}>
              Go to Home
            </button>
          </div>
        )}

        {/* TOTP Optional step */}
        {step === 'totp-optional' && (
          <div>
            <CheckCircle size={44} color="#10b981" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Signed In Successfully</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Two-factor authentication is not configured. Add Google Authenticator for extra security?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { navigate('/', { replace: true }); }}
                style={{
                  flex: 1, padding: '0.75rem', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: '0.5rem',
                  color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
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

        {/* QR Code step */}
        {step === 'totp-qr' && (
          <div>
            <ScanLine size={36} color="var(--accent)" style={{ marginBottom: '0.5rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.35rem' }}>Scan QR Code</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 1.25rem' }}>
              Open <strong>Google Authenticator</strong> → tap <strong>+</strong> → <strong>Scan QR code</strong>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src={qrCode} alt="TOTP QR Code"
                style={{ width: 200, height: 200, borderRadius: '0.5rem', background: '#fff', padding: '0.5rem' }} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.25rem', color: 'var(--text-muted-2)', fontSize: '0.75rem' }}>
              <p style={{ margin: '0 0 0.25rem' }}>Or enter this key manually:</p>
              <code style={{ fontSize: '0.8rem', color: 'var(--accent)', background: 'var(--hover-overlay)', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', wordBreak: 'break-all' }}>
                {qrSecret}
              </code>
            </div>

            <form onSubmit={handleQrVerify}>
              <input type="text" inputMode="numeric" value={qrToken}
                onChange={(e) => setQrToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" autoFocus maxLength={6}
                style={{
                  width: '100%', padding: '0.85rem', boxSizing: 'border-box',
                  background: 'var(--bg-primary)', border: '2px solid var(--accent)',
                  borderRadius: '0.5rem', color: 'var(--text-primary)',
                  fontSize: '1.5rem', letterSpacing: '0.5em', textAlign: 'center',
                  outline: 'none', marginBottom: '1rem',
                }} />
              <button type="submit" disabled={loading || qrToken.length < 6}
                style={{
                  width: '100%', padding: '0.85rem',
                  background: loading || qrToken.length < 6 ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  border: 'none', borderRadius: '0.5rem',
                  color: loading || qrToken.length < 6 ? 'var(--text-muted)' : '#fff',
                  cursor: loading || qrToken.length < 6 ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                {loading ? <RefreshCw size={18} className="lucide-spin" /> : <Smartphone size={18} />}
                Verify & Complete Setup
              </button>
            </form>
            {msgBox}
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div>
            <CheckCircle size={44} color="#10b981" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0' }}>Google Authenticator Active</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Two-factor authentication is now enabled. Redirecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Callback;
