import { useState } from 'react'

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

export default function Register() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setError('')

    if (name === 'password') {
      const strength = calculatePasswordStrength(value)
      setPasswordStrength(strength)
    }
  }

  const calculatePasswordStrength = (password) => {
    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 10) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return Math.min(strength, 4)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role
        })
      })
      
      const data = await response.json()
      
      if (data.token) {
        setSuccess(true)
        localStorage.setItem('cims_token', data.token)
        localStorage.setItem('cims_user', JSON.stringify(data.user))
        
        setTimeout(() => {
          window.location.href = '/profile'
        }, 1500)
      } else {
        setError(data.error || 'Erreur lors de l\'inscription')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort']
  const strengthColors = ['#FF5252', '#FFB300', '#FFB300', '#00C853', '#00C853']

  return (
    <div className="auth-page">
      <div className="auth-orbs">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      <div className="auth-container" style={{ maxWidth: '1100px' }}>
        <aside className="auth-brand-panel">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 9l10 13 10-13-10-11z"/>
                <path d="M2 9l10 13 10-13"/>
                <path d="M12 12v10"/>
              </svg>
            </div>
            <div className="auth-logo-text">
              <h1>CIMS</h1>
              <span>CIMS</span>
            </div>
          </div>

          <div className="auth-hero">
            <h2>Rejoignez la communauté santé</h2>
            <p>Créez votre compte pour accéder à tous les services numériques de santé .</p>
            
            <div className="auth-stats">
              <div className="auth-stat-pill">
                <strong>100%</strong>
                <span>Gratuit</span>
              </div>
              <div className="auth-stat-pill">
                <strong>24/7</strong>
                <span>Accessible</span>
              </div>
              <div className="auth-stat-pill">
                <strong>🔒</strong>
                <span>Sécurisé</span>
              </div>
            </div>
          </div>

          <div className="auth-brand-footer">
            <p>© 2025 CIMS — CIMS</p>
          </div>
        </aside>

        <main className="auth-form-panel">
          <div className="auth-tabs">
            <button 
              className="auth-tab"
              onClick={() => window.location.href = '/'}
            >
              Se connecter
            </button>
            <button className="auth-tab active">
              S'inscrire
            </button>
            <div className="auth-tab-indicator" style={{ width: '50%', left: '50%' }} />
          </div>

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

          {success && (
            <div className="auth-alert success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Compte créé ! Redirection...
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <input
                  type="text"
                  name="firstName"
                  className="auth-input"
                  placeholder=" "
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
                <UserIcon />
                <label className="floating-label">
                  <span>Prénom</span>
                </label>
              </div>

              <div className="input-group">
                <input
                  type="text"
                  name="lastName"
                  className="auth-input"
                  placeholder=" "
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
                <UserIcon />
                <label className="floating-label">
                  <span>Nom</span>
                </label>
              </div>
            </div>

            <div className="input-group">
              <input
                type="email"
                name="email"
                className="auth-input"
                placeholder=" "
                value={form.email}
                onChange={handleChange}
                required
              />
              <EmailIcon />
              <label className="floating-label">
                <span>Adresse email</span>
              </label>
            </div>

            <div className="input-group">
              <select
                name="role"
                className="auth-select"
                value={form.role}
                onChange={handleChange}
                style={{ paddingLeft: '1rem' }}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Médecin</option>
              </select>
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
                minLength={6}
              />
              <LockIcon />
              <label className="floating-label">
                <span>Mot de passe</span>
              </label>
            </div>

            {form.password && (
              <div className="password-strength">
                {[1,2,3,4].map((level) => (
                  <div 
                    key={level}
                    className={`password-strength-bar ${
                      passwordStrength >= level 
                        ? (passwordStrength <= 1 ? 'weak' : passwordStrength <= 2 ? 'medium' : 'strong')
                        : ''
                    }`}
                    style={{ 
                      background: passwordStrength >= level ? strengthColors[passwordStrength-1] : undefined 
                    }}
                  />
                ))}
                <span style={{ 
                  fontSize: 'var(--text-xs)', 
                  color: passwordStrength > 0 ? strengthColors[passwordStrength-1] : 'var(--text-muted)',
                  marginLeft: '0.5rem'
                }}>
                  {passwordStrength > 0 ? strengthLabels[passwordStrength-1] : ''}
                </span>
              </div>
            )}

            <div className="input-group">
              <input
                type="password"
                name="confirmPassword"
                className="auth-input"
                placeholder=" "
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
              <LockIcon />
              <label className="floating-label">
                <span>Confirmer le mot de passe</span>
              </label>
            </div>

            <button 
              type="submit" 
              className={`auth-submit ${loading ? 'loading' : ''} ${success ? 'success' : ''}`}
              disabled={loading || success}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Inscription...' : success ? 'Compte créé !' : 'Créer mon compte'}
            </button>

            <div className="auth-link">
              Déjà inscrit ? <a href="/">Se connecter</a>
            </div>

            <div className="auth-rgpd">
              <ShieldIcon />
              <p>
                En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité. 
                Vos données personnelles sont protégées par la legislation tunisienne.
              </p>
            </div>
          </form>
        </main>
      </div>
    </div>
  )
}
