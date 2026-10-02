import { useState, useEffect } from 'react';
import { Mail, Save, Clock, User, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getToken, ensureValidToken, getUserInfo } from '../keycloak.js';

const API_CONFIG = '/api/v1/config/gmail-recipient';

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

export default function Settings() {
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await authFetch(API_CONFIG);
      if (r && r.ok) {
        const d = await r.json();
        setEmail(d.email);
        setSavedEmail(d.email);
      }
      const h = await authFetch(`${API_CONFIG}/history`);
      if (h && h.ok) {
        const d = await h.json();
        setHistory(d.history || []);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    const r = await authFetch(API_CONFIG, {
      method: 'PUT',
      body: JSON.stringify({ email }),
    });
    if (r && r.ok) {
      const d = await r.json();
      setSavedEmail(d.email);
      setMsg({ type: 'success', text: 'Recipient updated successfully.' });
      // Refresh history
      const h = await authFetch(`${API_CONFIG}/history`);
      if (h && h.ok) {
        const hd = await h.json();
        setHistory(hd.history || []);
      }
    } else {
      setMsg({ type: 'error', text: 'Failed to save. Check backend connection.' });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 4000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '5rem' }}>
        <RefreshCw size={28} className="lucide-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', width: '100%', maxWidth: '640px', margin: '0 auto' }}>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Mail size={24} color="var(--accent)" /> Email Report Settings
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
        Configure who receives the security alert emails when a threat is detected.
      </p>

      {/* Current recipient card */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '0.875rem', padding: '1.5rem', marginBottom: '1.5rem',
      }}>
        <label style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Recipient Email
        </label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="security-team@company.com"
            style={{
              flex: 1, padding: '0.75rem 1rem',
              background: 'var(--bg-primary)', border: '1px solid var(--border-input)',
              borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || email === savedEmail}
            style={{
              padding: '0.75rem 1.25rem',
              background: email === savedEmail ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
              border: `1px solid ${email === savedEmail ? 'var(--border)' : 'rgba(99,102,241,0.35)'}`,
              borderRadius: '0.5rem',
              color: email === savedEmail ? 'var(--text-muted)' : '#fff',
              cursor: email === savedEmail ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {saving ? <RefreshCw size={16} className="lucide-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {msg && (
          <div style={{
            marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
            fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px',
            background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: msg.type === 'success' ? 'var(--success)' : 'var(--error)',
          }}>
            {msg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {msg.text}
          </div>
        )}

        {savedEmail && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={12} color="var(--success)" /> Active: <strong style={{ color: 'var(--text-secondary)' }}>{savedEmail}</strong>
          </div>
        )}
      </div>

      {/* History */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '0.875rem', padding: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--accent)" /> Previous Recipients
        </h2>

        {history.length === 0 ? (
          <p style={{ color: 'var(--text-muted-2)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
            No previous recipients — history is recorded when you change the email.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {history.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.6rem 0.75rem', background: 'var(--hover-overlay)',
                borderRadius: '0.5rem', fontSize: '0.85rem',
              }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{entry.email}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted-2)', fontSize: '0.75rem' }}>
                  <User size={12} /> {entry.changed_by || '—'}
                  <span>·</span>
                  <Clock size={12} /> {new Date(entry.changed_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
