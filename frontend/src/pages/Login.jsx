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

const HeartPulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
  </svg>
)

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2v4"/>
    <path d="M16 2v4"/>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <path d="M3 10h18"/>
    <path d="M16 14h.01"/>
    <path d="M12 18h.01"/>
    <path d="M8 18h.01"/>
  </svg>
)

const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
)

const StethoscopeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4.8 2.3A.3.3 0 0 1 5 2h14a.3.3 0 0 1 .2.3v3.4a.3.3 0 0 1-.2.3l-3.2 1.8a4.6 4.6 0 0 1-4.6 0l-3.2-1.8a.3.3 0 0 1-.2-.3V2.3z"/>
    <path d="M8 15v5"/>
    <path d="M16 15v5"/>
    <path d="M12 15v5"/>
    <path d="M9 20h6"/>
    <path d="M12 15V8a2 2 0 0 0-2-2H8"/>
  </svg>
)

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
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

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
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
      {/* Animated Background */}
      <div className="auth-bg">
        <div className="auth-bg-gradient auth-bg-gradient-1" />
        <div className="auth-bg-gradient auth-bg-gradient-2" />
        <div className="auth-bg-gradient auth-bg-gradient-3" />
        <div className="auth-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{ '--delay': `${i * 0.5}s`, '--x': `${Math.random() * 100}%`, '--duration': `${15 + Math.random() * 20}s` }} />
          ))}
        </div>
      </div>

      <div className="auth-container">
        {/* Left Panel - Branding */}
        <aside className="auth-brand-panel">
          <div className="auth-brand-content">
            <div className="auth-logo">
              <div className="auth-logo-icon">
                <HeartPulseIcon />
              </div>
              <div className="auth-logo-text">
                <h1>CIMS</h1>
                <span>Santé Numérique</span>
              </div>
            </div>

            <div className="auth-hero">
              <div className="auth-hero-badge">
                <span className="badge-pulse" />
                Système Informatisé
              </div>
              <h2>Votre santé,<br /><span className="text-gradient">notre priorité</span></h2>
              <p>Accédez à votre espace de santé numérique. Gérez vos rendez-vous, consultez votre dossier médical et communiquez avec votre équipe soignante en toute sécurité.</p>
              
              <div className="auth-features">
                <div className="auth-feature">
                  <div className="auth-feature-icon"><CalendarIcon /></div>
                  <div>
                    <strong>Rendez-vous</strong>
                    <span>Prise de RDV en ligne</span>
                  </div>
                </div>
                <div className="auth-feature">
                  <div className="auth-feature-icon"><StethoscopeIcon /></div>
                  <div>
                    <strong>Dossier médical</strong>
                    <span>Accessible 24h/24</span>
                  </div>
                </div>
                <div className="auth-feature">
                  <div className="auth-feature-icon"><ShieldCheckIcon /></div>
                  <div>
                    <strong>Sécurisé</strong>
                    <span>Conformité RGPD / GDPR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">
            <div className="auth-brand-stats">
              <div className="auth-brand-stat">
                <span className="stat-number">127</span>
                <span className="stat-label">Hôpitaux</span>
              </div>
              <div className="auth-brand-stat">
                <span className="stat-number">4,800+</span>
                <span className="stat-label">Médecins</span>
              </div>
              <div className="auth-brand-stat">
                <span className="stat-number">2.1M</span>
                <span className="stat-label">Patients</span>
              </div>
            </div>
            <p>© 2025 CIMS — CIMS</p>
          </div>
        </aside>

        {/* Right Panel - Form */}
        <main className="auth-form-panel">
          <div className="auth-form-header">
            <h3>Bienvenue</h3>
            <p>Connectez-vous pour accéder à votre espace</p>
          </div>

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
              <button type="button" className="password-toggle">
                <EyeIcon />
              </button>
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

            <div className="auth-rgpd">
              <ShieldCheckIcon />
              <p>
                <strong>Protection de vos données :</strong> Vos informations sont chiffrées et protégées conformément à la réglementation applicable sur la protection des données personnelles.
              </p>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
