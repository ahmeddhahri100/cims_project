import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { ThemeProvider } from './ThemeContext.jsx'
import App from './App.jsx'
import Callback from './pages/Callback.jsx'
import Login from './pages/Login.jsx'
import { ensureValidToken } from './keycloak.js'

function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await ensureValidToken();
      setValid(ok);
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)'
      }}>
        <div className="lucide-spin" style={{
          width: 28, height: 28, border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
        }} />
      </div>
    );
  }

  if (!valid) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)