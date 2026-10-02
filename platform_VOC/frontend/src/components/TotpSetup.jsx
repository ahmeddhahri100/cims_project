import { useState, useEffect } from 'react';
import { Shield, Smartphone, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getToken, ensureValidToken } from '../keycloak.js';

async function authFetch(url, opts = {}) {
  const valid = await ensureValidToken();
  if (!valid) return null;
  const token = getToken();
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
}

export default function TotpSetup({ userId, onStatusChange, autoStart }) {
  const [step, setStep] = useState('idle');
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (autoStart && step === 'idle') startSetup();
  }, [autoStart]);

  const startSetup = async () => {
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
        setSecret(d.secret);
        setStep('scan');
      } else {
        setMessage({ type: 'error', text: d.error || 'Failed to generate QR code' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    }
    setLoading(false);
  };

  const verifySetup = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setMessage({ type: 'error', text: 'Enter the 6-digit code from Google Authenticator' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch('/api/v1/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: verificationCode }),
      });
      const d = await r.json();
      if (d.success) {
        setStep('done');
        setMessage({ type: 'success', text: 'Google Authenticator set up successfully!' });
        if (onStatusChange) onStatusChange(true);
      } else {
        setMessage({ type: 'error', text: d.error || 'Verification failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    }
    setLoading(false);
  };

  const disableTotp = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const r = await authFetch('/api/v1/totp/disable', {
        method: 'DELETE',
        body: JSON.stringify({ userId }),
      });
      const d = await r.json();
      if (d.success) {
        setStep('idle');
        setQrCode(null);
        setSecret(null);
        setVerificationCode('');
        setMessage({ type: 'success', text: 'Two-factor authentication disabled' });
        if (onStatusChange) onStatusChange(false);
      } else {
        setMessage({ type: 'error', text: d.error || 'Failed to disable' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error' });
    }
    setLoading(false);
  };

  if (step === 'scan') {
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '1.5rem', background: 'var(--bg-card)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone size={18} color="var(--accent)" /> Scan QR Code
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Open <strong>Google Authenticator</strong> → tap <strong>+</strong> → <strong>Scan QR code</strong>
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <img src={qrCode} alt="TOTP QR Code" style={{ width: 200, height: 200, borderRadius: '0.5rem', background: '#fff', padding: '0.5rem' }} />
        </div>

        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted-2)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Or enter this key manually:</p>
          <code style={{ fontSize: '0.8rem', color: 'var(--accent)', background: 'var(--hover-overlay)', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', wordBreak: 'break-all' }}>{secret}</code>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input type="text" placeholder="000000" maxLength={6} value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--accent)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '1.2rem', letterSpacing: '0.5em', textAlign: 'center' }} />
          <button onClick={verifySetup} disabled={loading}
            style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', border: 'none', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {loading ? <RefreshCw size={16} className="lucide-spin" /> : 'Verify'}
          </button>
        </div>

        {message && (
          <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px',
            background: message.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--error)',
          }}>
            {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {message.text}
          </div>
        )}
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div style={{ border: '1px solid rgba(16,185,129,0.3)', borderRadius: '0.875rem', padding: '1.5rem', background: 'rgba(16,185,129,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
          <CheckCircle size={20} color="var(--success)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Google Authenticator Active</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          You'll need to enter a 6-digit code from Google Authenticator every time you log in.
        </p>
        <button onClick={disableTotp} disabled={loading}
          style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', color: '#ef4444', cursor: 'pointer', fontSize: '0.82rem' }}>
          {loading ? 'Disabling...' : 'Disable Two-Factor'}
        </button>
        {message && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: message.type === 'success' ? 'var(--success)' : 'var(--error)' }}>
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '1.5rem', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
        <Shield size={20} color="var(--accent)" />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Two-Factor Authentication</h3>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Add an extra layer of security by requiring a one-time code from Google Authenticator.
      </p>
      <button onClick={startSetup} disabled={loading}
        style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', border: 'none', borderRadius: '0.5rem', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
        {loading ? 'Generating...' : 'Set Up Google Authenticator'}
      </button>
      {message && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px',
          background: message.type === 'error' ? 'rgba(239,68,68,0.15)' : 'none',
          color: message.type === 'error' ? 'var(--error)' : 'var(--text-primary)',
        }}>
          {message.type === 'error' && <AlertCircle size={14} />}
          {message.text}
        </div>
      )}
    </div>
  );
}
