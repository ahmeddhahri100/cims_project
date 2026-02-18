import { useState } from 'react'
import { Link } from 'react-router-dom'

// SVG Icons as components
const DiamondIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 9l10 13 10-13-10-11z"/>
    <path d="M2 9l10 13 10-13"/>
    <path d="M12 12v10"/>
  </svg>
)

const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('login')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      
      const data = await response.json()
      
      if (data.token) {
        setSuccess(true)
        localStorage.setItem('cims_token', data.token)
        localStorage.setItem('cims_user', JSON.stringify(data.user))
        
        setTimeout(() => {
          if (onLogin) onLogin(data)
          window.location.href = '/profile'
        }, 1000)
      } else {
        setError(data.error || 'Identifiants incorrects')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Animated Background Orbs */}
      <div className="auth-orbs">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <div className="auth-container">
        {/* Left Panel - Branding */}
        <aside className="auth-brand-panel">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <DiamondIcon />
            </div>
            <div className="auth-logo-text">
              <h1>CIMS</h1>
              <span>CIMS</span>
            </div>
          </div>

          <div className="auth-hero">
            <h2>Plateforme de Santé Numérique</h2>
            <p>CIMS. Accédez à votre espace professionnel.</p>
            
            <div className="auth-stats">
              <div className="auth-stat-pill">
                <strong>127</strong>
                <span>Hôpitaux</span>
              </div>
              <div className="auth-stat-pill">
                <strong>4,800</strong>
                <span>Médecins</span>
              </div>
              <div className="auth-stat-pill">
                <strong>2.1M</strong>
                <span>Dossiers</span>
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">
            <p>© 2025 CIMS — CIMS</p>
          </div>
        </aside>

        {/* Right Panel - Form */}
        <main className="auth-form-panel">
          {/* Tabs */}
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Se connecter
            </button>
            <button 
              className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => window.location.href = '/register'}
            >
              S'inscrire
            </button>
            <div 
              className="auth-tab-indicator"
              style={{ 
                width: '50%', 
                left: activeTab === 'login' ? '0%' : '50%' 
              }}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <div className="auth-alert error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="auth-alert success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Connexion réussie ! Redirection...
            </div>
          )}

          {/* Login Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="email"
                name="email"
                className="auth-input"
                placeholder=" "
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
              <EmailIcon />
              <label className="floating-label">
                <span>Adresse email</span>
              </label>
            </div>

            <div className="input-group">
              <input
                type="password"
                name="password"
                className="auth-input"
                placeholder=" "
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
              <LockIcon />
              <label className="floating-label">
                <span>Mot de passe</span>
              </label>
            </div>

            <button 
              type="submit" 
              className={`auth-submit ${loading ? 'loading' : ''} ${success ? 'success' : ''}`}
              disabled={loading || success}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Connexion...' : success ? 'Bienvenue !' : 'Se connecter'}
            </button>

            <div className="auth-link">
              <a href="#">Mot de passe oublié ?</a>
            </div>

            <div className="auth-divider">ou</div>

            <div className="auth-rgpd">
              <ShieldIcon />
              <p>
                Vos données sont protégées conformément à la réglementation applicable sur la protection des données personnelles. 
                Ce site utilise des cookies sécurisés pour l'authentification.
              </p>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
