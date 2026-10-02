import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const HeartPulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>
  </svg>
)

const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const AlertCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M3 10h18"/>
  </svg>
)

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)

export default function Login({ onLogin }) {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
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
        setError(data.error || t('login.error'))
      }
    } catch {
      setError(t('login.server_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-gradient auth-bg-gradient-1" />
        <div className="auth-bg-gradient auth-bg-gradient-2" />
        <div className="auth-bg-gradient auth-bg-gradient-3" />
      </div>

      <div className="auth-container">
        <aside className="auth-brand-panel" style={{ padding: '2.5rem', background: '#0d1b2a' }}>
          <img src="/image/cims%20logo.png" alt="CIMS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </aside>

          <main className="auth-form-panel" style={{ position: 'relative', justifyContent: 'center', paddingBottom: 0 }}>
            <button className="profile-lang-btn" onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')} style={{ position: 'absolute', top: '1rem', right: '1.5rem' }}>
              {i18n.language === 'fr' ? 'EN' : 'FR'}
            </button>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src="/image/logo-cims2021.png" alt="CIMS" style={{ height: '80px', width: 'auto', transform: 'translateY(-1rem)' }} />
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab ${'active'}`}>{t('login.tab')}</button>
            <button className="auth-tab" onClick={() => window.location.href = '/register'}>{t('login.tab_register')}</button>
          </div>

          {error && (
            <div className="auth-alert error">
              <AlertCircleIcon />
              {error}
            </div>
          )}

          {success && (
            <div className="auth-alert success">
              <CheckCircleIcon />
              {t('login.success_redirect')}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className={`input-group ${focusedField === 'email' || form.email ? 'focused' : ''}`}>
              <div className="input-icon"><EmailIcon /></div>
              <input
                type="email" name="email"
                className="auth-input"
                placeholder={t('login.email')}
                value={form.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required autoComplete="email"
              />
            </div>

            <div className={`input-group ${focusedField === 'password' || form.password ? 'focused' : ''}`}>
              <div className="input-icon"><LockIcon /></div>
              <input
                type={showPassword ? 'text' : 'password'} name="password"
                className="auth-input"
                placeholder={t('login.password')}
                value={form.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required autoComplete="current-password"
              />
              <button type="button" className="input-suffix" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                <EyeIcon />
              </button>
            </div>



            <button type="submit" className={`auth-submit ${loading ? 'loading' : ''} ${success ? 'success' : ''}`} disabled={loading || success}>
              {loading && <span className="spinner" />}
              {loading ? t('login.loading') : success ? t('login.success') : t('login.submit')}
            </button>

            <div className="auth-form-footer">
              <span>{t('login.no_account')}</span>
              <Link to="/register">{t('login.signup')} <ArrowRightIcon /></Link>
            </div>

          </form>
        </main>
      </div>
    </div>
  )
}
