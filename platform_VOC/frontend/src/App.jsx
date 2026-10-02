import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './index.css';
import { getUserInfoAsync, logout, getToken, ensureValidToken, performKeycloakLogout } from './keycloak.js';
import { 
  User, Database, Clock, ShieldAlert, Target, Search, 
  RefreshCw, LogOut, AlertCircle, CheckCircle, 
  ClipboardList, ChevronDown, Activity, Sun, Moon, Zap, Mail
} from 'lucide-react';
import { useTheme } from './ThemeContext.jsx';
import ChatBot from './components/ChatBot.jsx';
import Settings from './pages/Settings.jsx';

// ─── Config ───────────────────────────────────────────────────────────────────
// n8n webhook goes through Vite proxy (/webhook → localhost:5678)
const N8N_WEBHOOK   = '/webhook/cims-monitor';
// History/latest reads go through Vite proxy (/api → localhost:8000)
const API_LATEST    = '/api/v1/detection/latest-analysis';
const API_HISTORY   = '/api/v1/detection/analysis-history';

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = {
  CRITICAL: { bg: 'var(--palette-critical-bg)', border: '#ef4444', text: 'var(--palette-critical-text)', badge: '#ef4444', glow: '#ef444440' },
  HIGH:     { bg: 'var(--palette-high-bg)',      border: '#f59e0b', text: 'var(--palette-high-text)',      badge: '#f59e0b', glow: '#f59e0b40' },
  MEDIUM:   { bg: 'var(--palette-medium-bg)',    border: '#3b82f6', text: 'var(--palette-medium-text)',    badge: '#3b82f6', glow: '#3b82f640' },
  LOW:      { bg: 'var(--palette-low-bg)',       border: '#22c55e', text: 'var(--palette-low-text)',       badge: '#22c55e', glow: '#22c55e40' },
  NONE:     { bg: 'var(--palette-none-bg)',      border: '#475569', text: 'var(--palette-none-text)',      badge: '#64748b', glow: '#47556940' },
};
const pal = (lvl) => PALETTE[(lvl || 'NONE').toUpperCase()] || PALETTE.NONE;

// ─── Mini components ──────────────────────────────────────────────────────────
const Badge = ({ label, color = '#3b82f6', small }) => (
  <span style={{
    background: color + '22', color, border: `1px solid ${color}44`,
    borderRadius: '999px', padding: small ? '2px 8px' : '4px 12px',
    fontSize: small ? '0.7rem' : '0.75rem', fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', margin: '2px 3px 2px 0',
  }}>{label}</span>
);

const ThreatPill = ({ level, big }) => {
  const p = pal(level);
  return (
    <span style={{
      background: p.badge, color: '#fff',
      borderRadius: big ? '8px' : '999px',
      padding: big ? '6px 20px' : '3px 12px',
      fontWeight: 800,
      fontSize: big ? '1rem' : '0.75rem',
      letterSpacing: '0.06em',
      boxShadow: `0 0 12px ${p.glow}`,
      display: 'inline-flex',
      alignItems: 'center',
    }}>{level || 'NONE'}</span>
  );
};

const ConfBar = ({ val, label }) => {
  const p = Math.round((val || 0) * 100);
  const col = p > 75 ? '#22c55e' : p > 40 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Target size={12} /> {label}
        </span>
        <span style={{ color: col, fontWeight: 700, fontSize: '0.8rem' }}>{p}%</span>
      </div>
      <div style={{ background: 'var(--bg-primary)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: col, borderRadius: 999, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
};

const fmt = (ts) => ts ? new Date(ts).toLocaleString() : '—';
const ago = (ts) => {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const fmtTick = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Scan History Trend Chart ──────────────────────────────────────────────────
const THREAT_Y = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, NONE: 1 };
const THREAT_LABEL = ['', 'NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const THREAT_COLORS = {
  CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6',
  LOW: '#22c55e', NONE: '#64748b',
};

const ScanHistoryChart = ({ history }) => {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      if (w > 0) setWidth(w);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Sort oldest → newest for the chart
  const data = useMemo(
    () => [...history].reverse().map((r, i) => ({
      i,
      ts: r.timestamp,
      level: (r.threat_level || 'NONE').toUpperCase(),
      y: THREAT_Y[(r.threat_level || 'NONE').toUpperCase()] || 1,
      confidence: r.confidence || 0,
      row: r,
    })),
    [history]
  );

  if (data.length < 2) return null;

  const h = 500;
  const padding = { top: 40, right: 40, bottom: 70, left: 100 };
  const innerW = Math.max(width - padding.left - padding.right, 100);
  const innerH = h - padding.top - padding.bottom;
  const xStep = innerW / (data.length - 1);
  const yScale = (v) => padding.top + innerH - ((v - 1) / 4) * innerH;

  // Smooth cubic bezier path
  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: yScale(d.y),
    d,
  }));
  const linePath = points.map((pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const dx = (pt.x - prev.x) / 2;
    return `C ${prev.x + dx} ${prev.y}, ${pt.x - dx} ${pt.y}, ${pt.x} ${pt.y}`;
  }).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`;

  // Pick which x-ticks to label
  const tickIndexes = data.length <= 5
    ? data.map((_, i) => i)
    : [0, Math.floor((data.length - 1) / 3), Math.floor((2 * (data.length - 1)) / 3), data.length - 1];

  return (
    <div ref={wrapRef} style={{
      position: 'relative',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '0.875rem',
      padding: '1.25rem 1.25rem 0.75rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="var(--accent)" /> Threat Level Trend
        </h3>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'].map(lv => (
            <span key={lv} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: THREAT_COLORS[lv], boxShadow: `0 0 8px ${THREAT_COLORS[lv]}66` }} /> {lv}
            </span>
          ))}
        </div>
      </div>

      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="vocAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <filter id="vocGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Y grid + labels */}
        {[1, 2, 3, 4, 5].map(v => {
          const y = yScale(v);
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={padding.left + innerW} y2={y}
                stroke="var(--border-light)" strokeDasharray="4 5" strokeWidth="1" />
              <text x={padding.left - 14} y={y + 5} fill="var(--text-muted)" fontSize="13" textAnchor="end" fontWeight={700} letterSpacing="0.06em">
                {THREAT_LABEL[v]}
              </text>
            </g>
          );
        })}

        {/* X tick labels */}
        {tickIndexes.map(i => {
          const x = padding.left + i * xStep;
          return (
            <text key={i} x={x} y={h - padding.bottom + 25} fill="var(--text-muted)" fontSize="12" textAnchor="middle" fontWeight={500}>
              {fmtTick(data[i].ts)}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#vocAreaGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" filter="url(#vocGlow)" />

        {/* Points + hover hit areas */}
        {points.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x} cy={pt.y}
              r={hover === i ? 12 : 7}
              fill={THREAT_COLORS[pt.d.level]}
              stroke="var(--bg-card)" strokeWidth="3"
              style={{ cursor: 'pointer', transition: 'r 0.18s ease', filter: hover === i ? `drop-shadow(0 0 8px ${THREAT_COLORS[pt.d.level]})` : 'none' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            {/* Invisible wider hit area per column */}
            <rect
              x={pt.x - xStep / 2} y={padding.top}
              width={xStep} height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>

      {hover !== null && data[hover] && (() => {
        const d = data[hover];
        const x = padding.left + hover * xStep;
        const y = yScale(d.y);
        const tw = 280, th = 105;
        const tx = Math.min(Math.max(x - tw / 2, 8), width - tw - 8);
        const ty = Math.max(y - th - 14, 8);
        return (
          <div style={{
            position: 'absolute', left: tx, top: ty, width: tw,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.6rem',
            padding: '0.7rem 0.85rem', boxShadow: '0 10px 30px rgba(0,0,0,0.45)', pointerEvents: 'none', zIndex: 5,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: THREAT_COLORS[d.level], fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.06em' }}>{d.level}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{Math.round(d.confidence * 100)}% conf</span>
            </div>
            <div style={{
              color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.45,
              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {d.row.summary || 'No summary'}
            </div>
            <div style={{ color: 'var(--text-muted-2)', fontSize: '0.75rem', marginTop: 8, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} /> {fmt(d.ts)}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ─── Scan Result Card (used for both latest + history items) ─────────────────
const ScanCard = ({ row, index, expanded, onToggle }) => {
  const p = pal(row.threat_level);
  const isLatest = index === 0;
  return (
    <div style={{
      background: p.bg,
      border: `1px solid ${p.border}`,
      borderRadius: '0.875rem',
      marginBottom: '1rem',
      overflow: 'hidden',
      boxShadow: isLatest ? `0 0 20px ${p.glow}` : 'none',
      transition: 'box-shadow 0.3s',
    }}>
      {/* ── Header (always visible, click to expand) ── */}
      <div
        onClick={onToggle}
        style={{
          padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
          cursor: 'pointer',
          borderBottom: expanded ? `1px solid ${p.border}44` : 'none',
        }}
      >
        {/* Index badge */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: isLatest ? p.badge : 'var(--bg-secondary)',
          border: `2px solid ${p.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isLatest ? '#fff' : 'var(--text-primary)', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0,
        }}>
          {isLatest ? <Activity size={16} /> : `#${index + 1}`}
        </div>

        {/* Threat pill */}
        <ThreatPill level={row.threat_level} />

        {/* Summary preview */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {row.summary || 'No summary'}
          </div>
          <div style={{ color: 'var(--text-muted-2)', fontSize: '0.73rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {fmt(row.timestamp)}</span>
            <span>·</span>
            <span>{ago(row.timestamp)}</span>
            <span>·</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Database size={12} /> {row.logs_analyzed ?? '?'} logs</span>
          </div>
        </div>

        {/* Attack type badges */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200, justifyContent: 'flex-end', flexShrink: 0 }}>
          {(row.attack_types || []).slice(0, 2).map(t => <Badge key={t} label={t} color={p.badge} small />)}
        </div>

        {/* Confidence */}
        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Target size={12} /> {Math.round((row.confidence || 0) * 100)}%
        </div>

        {/* Chevron */}
        <div style={{ color: 'var(--text-muted-2)', flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none', display: 'flex', alignItems: 'center' }}>
          <ChevronDown size={18} />
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{ padding: '1.25rem' }}>

          {/* Full summary */}
          <p style={{ color: p.text, lineHeight: 1.7, marginBottom: '1rem', fontSize: '0.9rem' }}>
            {row.summary}
          </p>

          {/* Attack types + affected services */}
          {(row.attack_types?.length > 0 || row.affected_services?.length > 0) && (
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {row.attack_types?.length > 0 && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldAlert size={12} /> Attack Types
                  </div>
                  <div>{row.attack_types.map(t => <Badge key={t} label={t} color={p.badge} />)}</div>
                </div>
              )}
              {row.affected_services?.length > 0 && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Database size={12} /> Affected Services
                  </div>
                  <div>{row.affected_services.map(s => <Badge key={s} label={s} color="#a855f7" />)}</div>
                </div>
              )}
            </div>
          )}

          {/* Confidence bar */}
          <div style={{ marginBottom: '1.25rem' }}>
            <ConfBar val={row.confidence} label="AI Confidence Score" />
          </div>

          {/* Recommendations */}
          {row.recommendations?.length > 0 && (
            <div style={{
              background: 'var(--overlay-bg)', borderRadius: '0.625rem',
              padding: '1rem', marginBottom: '1rem', border: '1px solid var(--border)'
            }}>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardList size={14} /> Recommendations
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.9 }}>
                {row.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Session + raw response */}
          <div style={{ color: 'var(--text-muted-2)', fontSize: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {row.session_id && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Database size={12} /> Session: <code style={{ color: 'var(--text-muted)' }}>{row.session_id}</code></span>}
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Database size={12} /> DB record #{row.id}</span>
          </div>
        </div>
      )}
    </div>
  );
};



// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]             = useState(null);
  const [history, setHistory]       = useState([]);
  const [loadingDB, setLoadingDB]   = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [scanMsg, setScanMsg]       = useState('');
  const [error, setError]           = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [expanded, setExpanded]     = useState({});
  const [scanEmail, setScanEmail]   = useState('');
  const intervalRef                 = useRef(null);
  const navigate                    = useNavigate();
  const location                    = useLocation();
  const { theme, toggleTheme }      = useTheme();

  useEffect(() => {
    (async () => {
      const ui = await getUserInfoAsync();
      if (ui) setUser(ui);
      else navigate('/login', { replace: true });
    })();
  }, [navigate]);

  const authFetch = useCallback(async (url, opts = {}) => {
    const valid = await ensureValidToken();
    if (!valid) {
      logout();
      navigate('/login', { replace: true });
      return null;
    }
    const token = getToken();
    return fetch(url, {
      ...opts,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    });
  }, [navigate]);

  // ── Fetch history from PostgreSQL ─────────────────────────────────────────
  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setLoadingDB(true);
    try {
      const r = await authFetch(`${API_HISTORY}?limit=50`);
      if (!r) return;
      if (!r.ok) throw new Error(`Backend ${r.status}`);
      const data = await r.json();
      setHistory(data.records || []);
      setLastRefresh(new Date());
      // Auto-expand the latest scan
      if (data.records?.length > 0) {
        setExpanded(prev => ({ ...prev, [data.records[0].id]: true }));
      }
    } catch (err) {
      setError(`Cannot reach backend (port 8000): ${err.message}`);
    }
    if (!silent) setLoadingDB(false);
  }, [authFetch]);

  // Initial load + auto-refresh every 20 s
  useEffect(() => {
    fetchHistory();
    intervalRef.current = setInterval(() => fetchHistory(true), 20000);
    return () => clearInterval(intervalRef.current);
  }, [fetchHistory]);

  // ── Trigger scan → calls n8n webhook directly ────────────────────────────
  const startScan = async () => {
    setScanning(true);
    setError(null);
    setScanMsg(
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RefreshCw size={16} className="lucide-spin" /> Sending scan request to n8n...
      </span>
    );

    try {
      const sessionId = `cims_${Date.now()}`;

      const resp = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:     'analyze',
          session_id: sessionId,
          namespace:  'cims',
          source:     'platform-voc-ui',
          timestamp:  new Date().toISOString(),
          recipient_email: scanEmail,
        }),
      });

      if (!resp.ok) {
        throw new Error(
          `n8n responded with ${resp.status}. ` +
          'Make sure to click "Execute workflow" in the CIMS Security Monitor workflow first.'
        );
      }

      setScanMsg(
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} color="#10b981" /> n8n accepted the scan! Waiting for Ollama AI analysis to complete...
        </span>
      );

      // Poll PostgreSQL for the new result (n8n stores it asynchronously)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const lr = await authFetch(API_LATEST);
          if (!lr) { clearInterval(poll); return; }
          const ld = await lr.json();
          if (ld.found && ld.session_id === sessionId) {
            clearInterval(poll);
            setScanMsg(
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="#10b981" /> Scan complete! Threat: {ld.threat_level}
              </span>
            );
            fetchHistory();
            setTimeout(() => setScanMsg(''), 4000);
          } else if (attempts >= 12) {  // 60s timeout
            clearInterval(poll);
            setScanMsg(
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} /> Scan in progress — results will appear automatically.
              </span>
            );
            fetchHistory();
            setTimeout(() => setScanMsg(''), 5000);
          }
        } catch {
          if (attempts >= 12) clearInterval(poll);
        }
      }, 5000);

    } catch (err) {
      setError(err.message);
      setScanMsg('');
    }

    setScanning(false);
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const handleLogout = () => { performKeycloakLogout(); };

  if (!user) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <RefreshCw size={24} className="lucide-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );

  const latest = history[0] || null;
  const isHome = location.pathname === '/';
  const isHistory = location.pathname === '/history';
  const isSettings = location.pathname === '/settings';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>

      {/* ═══════════════════ SIDEBAR ═══════════════════ */}
      <aside style={{
        width: 260, minWidth: 260,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        padding: '2rem 1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
        overflowY: 'auto',
      }}>
        <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={24} color="var(--accent)" />
          <span><span style={{ color: 'var(--accent)' }}>VOC</span> Platform</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--hover-overlay)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--bg-secondary)',
            border: '2px solid var(--border-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
          }}>
            <User size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.preferred_username || user.email}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: 1 }}>
              Administrator
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button onClick={() => navigate('/')} style={{
            padding: '0.6rem 0.75rem', background: location.pathname === '/' ? 'var(--hover-overlay)' : 'transparent',
            border: 'none', borderRadius: '0.5rem',
            color: location.pathname === '/' ? 'var(--accent)' : 'var(--text-tertiary)',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
            textAlign: 'left', width: '100%',
          }}>
            <Activity size={16} /> Dashboard
          </button>
          <button onClick={() => navigate('/history')} style={{
            padding: '0.6rem 0.75rem', background: location.pathname === '/history' ? 'var(--hover-overlay)' : 'transparent',
            border: 'none', borderRadius: '0.5rem',
            color: location.pathname === '/history' ? 'var(--accent)' : 'var(--text-tertiary)',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
            textAlign: 'left', width: '100%',
          }}>
            <ClipboardList size={16} /> Scan History
          </button>
          <button onClick={() => navigate('/settings')} style={{
            padding: '0.6rem 0.75rem', background: location.pathname === '/settings' ? 'var(--hover-overlay)' : 'transparent',
            border: 'none', borderRadius: '0.5rem',
            color: location.pathname === '/settings' ? 'var(--accent)' : 'var(--text-tertiary)',
            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
            textAlign: 'left', width: '100%',
          }}>
            <Mail size={16} /> Email Settings
          </button>
        </div>

        {/* Middle content (scrolls internally only if space is tight, so bottom actions stay visible) */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: 4 }}>
        {/* Latest threat status */}
        {latest && (
          <div style={{
            background: pal(latest.threat_level).bg,
            border: `1px solid ${pal(latest.threat_level).border}`,
            borderRadius: '0.75rem', padding: '1rem', textAlign: 'center',
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Latest Threat</div>
            <ThreatPill level={latest.threat_level} big />
            <div style={{ color: 'var(--text-muted-2)', fontSize: '0.75rem', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Clock size={12} /> {ago(latest.timestamp)}
            </div>
          </div>
        )}

        {/* Total scans */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 6 }}>Total Scans</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent)" /> {history.length}
          </div>
        </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={toggleTheme} style={{
            width: '100%', padding: '0.75rem',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: '0.5rem', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
          }}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={() => fetchHistory()} style={{
            width: '100%', padding: '0.75rem',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: '0.5rem', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
          }}>
            <RefreshCw size={14} /> Refresh Data
          </button>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '0.75rem',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: '0.5rem', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
          }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* ═══════════════════ MAIN ═══════════════════ */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <main style={{ padding: isHome ? '1.25rem 3rem' : '3rem', width: '100%', maxWidth: isSettings ? '900px' : '1100px', margin: '0 auto' }}>

        {isHome ? (
          /* ═══ DASHBOARD: chart-first layout ═══ */
          <>
            {/* Compact header bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                <ShieldAlert size={24} color="var(--accent)" /> Security Monitor
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="email"
                  value={scanEmail}
                  onChange={e => setScanEmail(e.target.value)}
                  placeholder="recipient@company.com"
                  disabled={scanning}
                  style={{
                    padding: '0.45rem 0.75rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-input)',
                    borderRadius: '0.5rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    outline: 'none',
                    width: '200px',
                  }}
                />
                <button
                  onClick={startScan}
                  disabled={scanning}
                  id="start-scan-btn"
                  style={{
                    padding: '0.5rem 1.1rem',
                    background: scanning
                      ? 'var(--bg-secondary)'
                      : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    border: `1px solid ${scanning ? 'var(--border)' : 'rgba(99,102,241,0.35)'}`,
                    borderRadius: '0.5rem',
                    color: scanning ? 'var(--text-muted)' : '#fff',
                    cursor: scanning ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: '0.8rem',
                    letterSpacing: '0.01em',
                    boxShadow: scanning ? 'none' : '0 2px 10px rgba(99,102,241,0.2)',
                    display: 'flex', alignItems: 'center', gap: '0.45rem',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    outline: 'none',
                  }}
                  onMouseEnter={e => { if (!scanning) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)'; } }}
                  onMouseLeave={e => { if (!scanning) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(99,102,241,0.2)'; } }}
                >
                  {scanning ? <RefreshCw size={14} className="lucide-spin" /> : <Zap size={14} />}
                  {scanning ? 'Analyzing…' : 'Run Scan'}
                </button>
              </div>
            </div>

            {/* Inline status + messages */}
            {(scanMsg || error || loadingDB) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {scanMsg && (
                  <div style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--accent)',
                    borderRadius: '0.5rem', padding: '0.5rem 1rem',
                    color: 'var(--text-tertiary)', fontSize: '0.8rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    {scanMsg}
                  </div>
                )}
                {error && (
                  <div style={{
                    background: 'rgba(69,10,10,0.6)', border: '1px solid #ef4444',
                    borderRadius: '0.5rem', padding: '0.5rem 1rem',
                    color: '#fca5a5', fontSize: '0.8rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <AlertCircle size={16} color="#ef4444" /> {error}
                    </div>
                    {error.includes('n8n') && (
                      <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#f87171', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <CheckCircle size={13} style={{ marginTop: 1 }} /> 
                        <span>In n8n, open <em>CIMS Security Monitor</em> and click <strong>"Execute workflow"</strong> before scanning.</span>
                      </div>
                    )}
                  </div>
                )}
                {loadingDB && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                    <RefreshCw size={14} className="lucide-spin" /> Syncing data…
                  </div>
                )}
              </div>
            )}

            {/* ── CHART (hero) ── */}
            {!loadingDB && history.length >= 2 && (
              <ScanHistoryChart history={history} />
            )}

            {/* ── Empty state (no data yet) ── */}
            {!loadingDB && history.length === 0 && (
              <div style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: '1rem', padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted-2)',
              }}>
                <ShieldAlert size={56} style={{ margin: '0 auto 1.25rem', color: 'var(--text-dim)' }} />
                <p style={{ fontSize: '1.05rem', color: 'var(--text-tertiary)', marginBottom: '0.4rem', fontWeight: 500 }}>No scan results yet</p>
                <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Click <strong style={{ color: 'var(--accent)' }}>Start Scan</strong> to run a security analysis.
                </p>
                <div style={{
                  background: 'var(--bg-primary)', borderRadius: '0.75rem', padding: '1.25rem',
                  textAlign: 'left', fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto',
                  border: '1px solid var(--border)'
                }}>
                  <strong style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem' }}>
                    <Activity size={13} /> Execution Flow
                  </strong>
                  <ol style={{ margin: '0.4rem 0 0 1.25rem', lineHeight: 2 }}>
                    <li>Click <strong style={{ color: 'var(--accent)' }}>Start Scan</strong></li>
                    <li>n8n + Ollama analyze cluster events</li>
                    <li>Result auto-appears on this dashboard</li>
                  </ol>
                </div>
              </div>
            )}
          </>
        ) : isHistory ? (
          /* ═══ HISTORY PAGE: scan tickets ═══ */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldAlert size={26} color="var(--accent)" /> Security Monitor
                </h1>
              </div>
            </div>

            {/* Scan status message */}
            {scanMsg && (
              <div style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--accent)',
                borderRadius: '0.75rem', padding: '1rem 1.5rem',
                color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                {scanMsg}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div style={{
                background: 'rgba(69,10,10,0.6)', border: '1px solid #ef4444',
                borderRadius: '0.75rem', padding: '1rem 1.5rem',
                color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <AlertCircle size={18} color="#ef4444" /> {error}
                </div>
                {error.includes('n8n') && (
                  <div style={{ marginTop: 10, fontSize: '0.85rem', color: '#f87171', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle size={14} style={{ marginTop: 2 }} /> 
                    <span>In n8n, open <em>CIMS Security Monitor</em> and click <strong>"Execute workflow"</strong> before scanning.</span>
                  </div>
                )}
              </div>
            )}

            {/* Loading */}
            {loadingDB && (
              <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={36} className="lucide-spin" style={{ margin: '0 auto 1rem', color: 'var(--accent)' }} />
                <p>Syncing data from PostgreSQL…</p>
              </div>
            )}

            {!loadingDB && history.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted-2)' }}>
                <ShieldAlert size={56} style={{ margin: '0 auto 1rem', color: 'var(--text-dim)' }} />
                <p style={{ fontSize: '1.05rem', color: 'var(--text-tertiary)' }}>No scan results yet.</p>
              </div>
            )}

            {!loadingDB && history.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ClipboardList size={20} color="var(--accent)" /> Scan History
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>
                      {history.length} scan{history.length !== 1 ? 's' : ''} — newest first · auto-refreshes every 20s
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setExpanded({})} style={{
                      padding: '0.5rem 1rem', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: '0.5rem',
                      color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.85rem',
                      transition: 'all 0.2s'
                    }}>Collapse all</button>
                    <button onClick={() => {
                      const all = {};
                      history.forEach(r => { all[r.id] = true; });
                      setExpanded(all);
                    }} style={{
                      padding: '0.5rem 1rem', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: '0.5rem',
                      color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '0.85rem',
                      transition: 'all 0.2s'
                    }}>Expand all</button>
                  </div>
                </div>

                {history.map((row, idx) => (
                  <ScanCard
                    key={row.id}
                    row={row}
                    index={idx}
                    expanded={!!expanded[row.id]}
                    onToggle={() => toggleExpand(row.id)}
                  />
                ))}
              </>
            )}
          </>
        ) : isSettings ? (
          <Settings />
        ) : null}
      </main>
      </div>

      <ChatBot />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .lucide-spin { animation: spin 2s linear infinite; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        *, *::before, *::after { transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--scrollbar-track); }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
      `}</style>
    </div>
  );
}
