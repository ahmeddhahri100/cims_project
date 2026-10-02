import { useState, useRef, useEffect } from 'react';
import { Shield, X, Send, User, Database, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

const API_CHAT = '/api/v1/chatbot/ask';
const API_HEALTH = '/api/v1/chatbot/health';

const suggestions = [
  'What are the latest threats?',
  'Show me critical attacks',
  'Which service is most targeted?',
  'Summary of last 24h',
  'How many total scans?',
];

function BotBubble({ text, isFinal }) {
  return (
    <div className="cb-bubble-bot">
      {text}
      {!isFinal && <span className="cb-cursor" />}
    </div>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm CIMS, your security analyst. I can read scan_sessions, ai_attack_analysis, attack_logs and more — ask me anything about your platform data.", ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamIdx, setStreamIdx] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const endRef = useRef(null);
  const messagesRef = useRef([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(API_HEALTH);
        const data = await res.json();
        setOllamaOnline(data.ollama);
      } catch { setOllamaOnline(false); }
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamIdx, loading]);

  // Word-by-word reveal on the latest bot message
  useEffect(() => {
    if (streamIdx === -1) return;
    setMessages(prev => prev.map((m, idx) => idx === streamIdx && m.text ? { ...m, text: '' } : m));
    const target = messagesRef.current[streamIdx];
    if (!target || target.role !== 'bot') return;
    const words = target.text.split(/(\s+)/);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      const partial = words.slice(0, i).join('');
      setMessages(prev => prev.map((m, idx) => idx === streamIdx ? { ...m, text: partial } : m));
      if (i >= words.length) { clearInterval(id); setStreamIdx(-1); }
    }, 28);
    return () => clearInterval(id);
  }, [streamIdx]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setShowSuggestions(false);

    setMessages(prev => [...prev, { role: 'user', text: q, ts: Date.now() }]);
    setLoading(true);

    try {
      const res = await fetch(API_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const answer = data.answer || data.error || 'No response';
      const newLen = messages.length + 1;
      setMessages(prev => [...prev, { role: 'bot', text: answer, ts: Date.now(), sources: data.sources }]);
      setStreamIdx(newLen);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: `Error: ${err.message}. Make sure the backend is running.`, ts: Date.now() }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const reset = () => {
    setMessages([{ role: 'bot', text: "Hi! I'm CIMS. Ask me anything about your security data.", ts: Date.now() }]);
    setShowSuggestions(true);
    setStreamIdx(-1);
  };

  const width  = expanded ? 'min(820px, 92vw)'  : '400px';
  const height = expanded ? 'min(80vh, 720px)'  : '560px';

  return (
    <>
      {/* ─── FLOATING BUBBLE ─── matches the .btn-primary style */}
      <button
        onClick={() => setOpen(!open)}
        className="cb-bubble"
        aria-label="Toggle CIMS Assistant"
      >
        {open ? <X size={22} color="#fff" /> : <Shield size={22} color="#fff" />}
      </button>

      {/* ─── CHAT PANEL ─── matches the .card style */}
      <div
        className="cb-panel"
        style={{
          width, height,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.96)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {/* ── HEADER ── */}
        <div className="cb-header">
          <div className="cb-avatar">
            <Shield size={16} color="#3b82f6" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cb-title">CIMS Security Analyst</div>
            <div className="cb-subtitle">
              <span className={`cb-dot ${ollamaOnline ? 'cb-dot-on' : 'cb-dot-off'}`} />
              {ollamaOnline ? 'Online' : 'Offline'}
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="cb-icon" title={expanded ? 'Restore' : 'Expand'}>
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button onClick={reset} className="cb-icon" title="Clear chat">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setOpen(false)} className="cb-icon" title="Close">
            <X size={15} />
          </button>
        </div>

        {/* ── MESSAGES ── */}
        <div className="cb-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className="cb-row"
              style={{
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                animationDelay: `${Math.min(i * 25, 150)}ms`,
              }}
            >
              <div className={`cb-icon-bubble ${msg.role === 'user' ? 'cb-icon-user' : 'cb-icon-bot'}`}>
                {msg.role === 'user' ? <User size={14} color="#fff" /> : <Shield size={13} color="#3b82f6" />}
              </div>
              {msg.role === 'user' ? (
                <div className="cb-bubble-user">{msg.text}</div>
              ) : (
                <BotBubble text={msg.text} isFinal={streamIdx === -1} />
              )}
            </div>
          ))}

          {loading && (
            <div className="cb-row">
              <div className="cb-icon-bubble cb-icon-bot">
                <Shield size={13} color="#3b82f6" />
              </div>
              <div className="cb-typing">
                <span /><span /><span />
                <em>analyzing database…</em>
              </div>
            </div>
          )}

          {showSuggestions && !loading && messages.length <= 1 && (
            <div className="cb-suggest-wrap">
              <div className="cb-suggest-label">Try asking</div>
              <div className="cb-suggest-list">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="cb-suggest-pill">{s}</button>
                ))}
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* ── INPUT ── */}
        <div className="cb-input-wrap">
          <div className="cb-input-box">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your security data…"
              className="cb-input"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="cb-send"
            >
              <Send size={15} color={input.trim() && !loading ? '#fff' : 'var(--text-muted)'} />
            </button>
          </div>
          <div className="cb-foot">
            <Database size={10} /> Real-time PostgreSQL data via Ollama
          </div>
        </div>
      </div>

      <style>{`
        .cb-bubble {
          position: fixed;
          bottom: 28px; right: 28px;
          width: 56px; height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #6366f1);
          border: none;
          cursor: pointer;
          z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 32px rgba(59,130,246,0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .cb-bubble:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(59,130,246,0.5);
        }
        .cb-bubble:active { transform: translateY(0) scale(0.96); }

        .cb-panel {
          position: fixed;
          bottom: 96px; right: 28px;
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border);
          border-radius: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          z-index: 9998;
          overflow: hidden;
          transition:
            width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
            height 0.35s cubic-bezier(0.4, 0, 0.2, 1),
            transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.25s ease;
        }

        .cb-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.9rem 1rem;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .cb-avatar {
          width: 36px; height: 36px;
          border-radius: 0.5rem;
          background: rgba(59,130,246,0.12);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .cb-title {
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.95rem;
          letter-spacing: -0.01em;
        }
        .cb-subtitle {
          color: var(--text-muted);
          font-size: 0.72rem;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 1px;
        }
        .cb-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          display: inline-block;
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }
        .cb-dot-on {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34,197,94,0.6);
        }
        .cb-dot-off {
          background: var(--text-muted);
          box-shadow: none;
        }
        .cb-icon {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 0.5rem;
          padding: 6px;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }
        .cb-icon:hover {
          background: var(--hover-overlay);
          color: var(--text-primary);
          border-color: var(--border);
        }

        .cb-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cb-messages::-webkit-scrollbar { width: 6px; }
        .cb-messages::-webkit-scrollbar-track { background: transparent; }
        .cb-messages::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
        .cb-messages::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }

        .cb-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          animation: cbRowIn 0.3s ease backwards;
        }
        @keyframes cbRowIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .cb-icon-bubble {
          width: 28px; height: 28px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .cb-icon-user { background: linear-gradient(135deg, var(--accent), #6366f1); }
        .cb-icon-bot  { background: var(--hover-overlay); border: 1px solid var(--border); }

        .cb-bubble-user {
          max-width: 80%;
          padding: 0.65rem 0.9rem;
          border-radius: 1rem 1rem 0.25rem 1rem;
          background: var(--accent);
          color: #fff;
          font-size: 0.88rem;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .cb-bubble-bot {
          max-width: 85%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          background: var(--bg-tertiary);
          backdrop-filter: blur(8px);
          color: var(--text-primary);
          font-size: 0.88rem;
          line-height: 1.6;
          border: 1px solid var(--border);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .cb-typing {
          padding: 0.7rem 0.9rem;
          border-radius: 0.75rem;
          background: var(--bg-tertiary);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .cb-typing span {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--text-muted);
          animation: cbTyping 1.2s infinite ease-in-out;
        }
        .cb-typing span:nth-child(2) { animation-delay: 0.15s; }
        .cb-typing span:nth-child(3) { animation-delay: 0.3s; }
        .cb-typing em {
          color: var(--text-muted);
          font-size: 0.75rem;
          font-style: normal;
          margin-left: 8px;
        }
        @keyframes cbTyping {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30%           { opacity: 1;   transform: translateY(-2px); }
        }

        .cb-cursor {
          display: inline-block;
          width: 2px; height: 0.9em;
          background: var(--accent);
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: cbBlink 0.9s steps(2) infinite;
        }
        @keyframes cbBlink { 50% { opacity: 0; } }

        .cb-suggest-wrap { margin-top: 4px; }
        .cb-suggest-label {
          color: var(--text-muted);
          font-size: 0.7rem;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }
        .cb-suggest-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .cb-suggest-pill {
          padding: 7px 16px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-secondary);
          color: var(--text-tertiary);
          font-size: 0.78rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .cb-suggest-pill:hover {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .cb-input-wrap {
          padding: 0.75rem 1rem 0.9rem;
          border-top: 1px solid var(--border);
          background: var(--bg-secondary);
          flex-shrink: 0;
        }
        .cb-input-box {
          display: flex;
          gap: 8px;
          background: var(--bg-primary);
          border-radius: 0.5rem;
          border: 1px solid var(--border-input);
          padding: 4px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .cb-input-box:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
        .cb-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          padding: 8px 12px;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.88rem;
        }
        .cb-input::placeholder { color: var(--text-muted); }
        .cb-send {
          width: 34px; height: 34px;
          border-radius: 0.5rem;
          border: none;
          background: linear-gradient(135deg, var(--accent), #6366f1);
          cursor: pointer;
          display: flex;
          align-items: center; justify-content: center;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .cb-send:hover:not(:disabled) { transform: scale(1.05); }
        .cb-send:disabled {
          background: var(--bg-tertiary);
          cursor: not-allowed;
          opacity: 0.4;
        }
        .cb-foot {
          text-align: center;
          color: var(--text-dim);
          font-size: 0.65rem;
          margin-top: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
      `}</style>
    </>
  );
}
