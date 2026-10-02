import { useState } from "react";
import { useTranslation } from 'react-i18next'

const HeartPulseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
  </svg>
)

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)

const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
)

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
)

const AlertCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
)

export default function Register() {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "", role: "patient"
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setError("")
    if (name === "password") setPasswordStrength(calculatePasswordStrength(value))
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
    if (form.password !== form.confirmPassword) { setError(t('register.password_mismatch')); return }
    if (form.password.length < 6) { setError(t('register.password_too_short')); return }
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName, role: form.role }),
      })
      const data = await response.json()
      if (data.token) {
        setSuccess(true)
        localStorage.setItem("cims_token", data.token)
        localStorage.setItem("cims_user", JSON.stringify(data.user))
        setTimeout(() => window.location.href = "/profile", 1500)
      } else {
        setError(data.error || t('register.error'))
      }
    } catch { setError(t('register.server_error'))
    } finally { setLoading(false) }
  }

  const strengthLabels = [t('register.strength_very_weak'), t('register.strength_weak'), t('register.strength_medium'), t('register.strength_strong'), t('register.strength_very_strong')]
  const strengthColors = ["#FF5252", "#FFB300", "#FFB300", "#00C853", "#00C853"]

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
          <div style={{ textAlign: 'center', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
            <img src="/image/logo-cims2021.png" alt="CIMS" style={{ height: '80px', width: 'auto' }} />
          </div>

          <div className="auth-tabs">
            <button className="auth-tab" onClick={() => window.location.href = "/"}>{t('login.tab')}</button>
            <button className="auth-tab active">{t('login.tab_register')}</button>
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
              {t('register.success')}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className={`input-group ${focusedField === 'firstName' || form.firstName ? 'focused' : ''}`}>
                <div className="input-icon"><UserIcon /></div>
                <input type="text" name="firstName" className="auth-input" placeholder={t('register.firstname')} value={form.firstName} onChange={handleChange} onFocus={() => setFocusedField('firstName')} onBlur={() => setFocusedField(null)} required />
              </div>
              <div className={`input-group ${focusedField === 'lastName' || form.lastName ? 'focused' : ''}`}>
                <div className="input-icon"><UserIcon /></div>
                <input type="text" name="lastName" className="auth-input" placeholder={t('register.lastname')} value={form.lastName} onChange={handleChange} onFocus={() => setFocusedField('lastName')} onBlur={() => setFocusedField(null)} required />
              </div>
            </div>

            <div className={`input-group ${focusedField === 'email' || form.email ? 'focused' : ''}`}>
              <div className="input-icon"><EmailIcon /></div>
              <input type="email" name="email" className="auth-input" placeholder={t('register.email')} value={form.email} onChange={handleChange} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} required />
            </div>

            <div className="role-selector">
              <label className="role-label">{t('register.role_label')}</label>
              <div className="role-cards">
                <div className={`role-card ${form.role === "patient" ? "selected" : ""}`} onClick={() => setForm({ ...form, role: "patient" })}>
                  <div className="role-card-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="role-card-content"><strong>{t('register.role_patient')}</strong><span>{t('register.role_patient_desc')}</span></div>
                  {form.role === "patient" && (
                    <div className="role-card-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                  )}
                </div>
                <div className={`role-card ${form.role === "doctor" ? "selected" : ""}`} onClick={() => setForm({ ...form, role: "doctor" })}>
                  <div className="role-card-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <div className="role-card-content"><strong>{t('register.role_doctor')}</strong><span>{t('register.role_doctor_desc')}</span></div>
                  {form.role === "doctor" && (
                    <div className="role-card-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`input-group ${focusedField === 'password' || form.password ? 'focused' : ''}`}>
              <div className="input-icon"><LockIcon /></div>
              <input type={showPassword ? 'text' : 'password'} name="password" className="auth-input" placeholder={t('register.password')} value={form.password} onChange={handleChange} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} required minLength={6} />
              <button type="button" className="input-suffix" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}><EyeIcon /></button>
            </div>

            {form.password && (
              <div className="password-strength">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className={`password-strength-bar ${passwordStrength >= level ? (passwordStrength <= 1 ? "weak" : passwordStrength <= 2 ? "medium" : "strong") : ""}`}
                    style={{ background: passwordStrength >= level ? strengthColors[passwordStrength - 1] : undefined }}
                  />
                ))}
                <span style={{ fontSize: "0.75rem", color: passwordStrength > 0 ? strengthColors[passwordStrength - 1] : "#94a3b8", marginLeft: "0.5rem", fontWeight: 500 }}>
                  {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : ""}
                </span>
              </div>
            )}

            <div className={`input-group ${focusedField === 'confirmPassword' || form.confirmPassword ? 'focused' : ''}`}>
              <div className="input-icon"><LockIcon /></div>
              <input type="password" name="confirmPassword" className="auth-input" placeholder={t('register.confirm_password')} value={form.confirmPassword} onChange={handleChange} onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField(null)} required />
            </div>

            <button type="submit" className={`auth-submit ${loading ? "loading" : ""} ${success ? "success" : ""}`} disabled={loading || success}>
              {loading && <span className="spinner" />}
              {loading ? t('register.loading') : success ? t('register.success') : t('register.submit')}
            </button>

            <div className="auth-form-footer">
              <span>{t('register.already_have_account')}</span>
              <a href="/">{t('nav.login')} <ArrowRightIcon /></a>
            </div>

          </form>
        </main>
      </div>
    </div>
  )
}
