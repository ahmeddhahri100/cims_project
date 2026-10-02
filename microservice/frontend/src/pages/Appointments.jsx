import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import "../profile.css";

const DiamondIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 9l10 13 10-13-10-11z"/></svg>
)
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
)

const getUser = () => {
  const userStr = localStorage.getItem('cims_user')
  return userStr ? JSON.parse(userStr) : null
}

const TIME_SLOTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'
]

function fmtDate(iso, locale) {
  const d = new Date(iso)
  return {
    day: d.getDate(),
    month: d.toLocaleString(locale, { month: 'short' }),
    time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleDateString(locale, { weekday: 'long' })
  }
}

export default function Appointments() {
  const { t, i18n } = useTranslation()
  const user = getUser()
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin'
  const [rdvs, setRdvs] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ doctor_id: '', date: '', time: '', reason: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const doctorId = localStorage.getItem('cims_doctor_id')

  useEffect(() => {
    loadDoctors()
    loadAppointments()
  }, [])

  const loadDoctors = async () => {
    try {
      const token = localStorage.getItem('cims_token')
      const res = await fetch('/api/rdv/doctors', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setDoctors(Array.isArray(data) ? data : [])
    } catch {}
  }

  const loadAppointments = async () => {
    try {
      const token = localStorage.getItem('cims_token')
      let url = isDoctor
        ? `/api/rdv${doctorId ? `?doctor_id=${doctorId}` : ''}`
        : '/api/rdv/my'
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await response.json()
      setRdvs(Array.isArray(data) ? data : [])
    } catch (err) { console.error('Error loading appointments:', err)
    } finally { setLoading(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem('cims_token')
    localStorage.removeItem('cims_user')
    window.location.href = '/'
  }

  const handleAccept = async (id) => {
    try {
      const token = localStorage.getItem('cims_token')
      await fetch(`/api/rdv/${id}/status?status=confirmed`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } })
      loadAppointments()
    } catch (err) { console.error('Error accepting:', err) }
  }

  const handleCancel = async (id) => {
    if (!confirm(t('appointments.cancel_confirm'))) return
    try {
      const token = localStorage.getItem('cims_token')
      await fetch(`/api/rdv/${id}/cancel`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
      loadAppointments()
    } catch (err) { console.error('Error cancelling:', err) }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('cims_token')
      const response = await fetch('/api/rdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ doctor_id: form.doctor_id, appointment_date: `${form.date}T${form.time}:00`, reason: form.reason, notes: form.notes })
      })
      const data = await response.json()
      if (data.id) {
        setSuccess(t('appointments.success'))
        setForm({ doctor_id: '', date: '', time: '', reason: '', notes: '' })
        setStep(1)
        loadAppointments()
      }
    } catch (err) { console.error('Error creating appointment:', err)
    } finally { setSaving(false) }
  }

  const sortedRdvs = [...rdvs].sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))

  const filteredRdvs = sortedRdvs.filter(r => {
    if (activeTab === 'active') return ['pending', 'confirmed'].includes(r.status)
    if (activeTab === 'history') return ['completed', 'cancelled'].includes(r.status)
    return true
  })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]
  const selectedDoctor = doctors.find(d => d.id === form.doctor_id)
  const locale = i18n.language

  const statusLabel = (s) => {
    switch(s) {
      case 'pending': return t('appointments.status_pending')
      case 'confirmed': return t('appointments.status_confirmed')
      case 'cancelled': return t('appointments.status_cancelled')
      case 'completed': return t('appointments.status_completed')
      default: return s
    }
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-header-content">
          <div className="profile-logo">
            <div className="profile-logo" style={{ gap: 0 }}>
              <img src="/image/logo-cims2021.png" alt="CIMS" style={{ height: '50px', width: 'auto' }} />
            </div>
          </div>
          <div className="profile-header-actions">
            <button className="profile-lang-btn" onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}>
              {i18n.language === 'fr' ? 'EN' : 'FR'}
            </button>
            <a href="/profile" className="profile-user-badge" style={{ textDecoration: 'none' }}><UserIcon />{user?.firstName} {user?.lastName}</a>
            <button className="profile-logout-btn" onClick={handleLogout}><LogoutIcon />{t('profile.logout')}</button>
          </div>
        </div>
      </header>

      <main className="profile-main">
        <div className="profile-container">
          <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', padding: '1.5rem 2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #dce3ed', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0 }}>
                {isDoctor ? t('appointments.title_all') : t('appointments.title_my')}
              </h1>
              <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: 'white', borderRadius: '50px', padding: '0.25rem 1rem', fontSize: '1rem', fontWeight: 700 }}>{filteredRdvs.length}</span>
            </div>
            <div className="auth-tabs" style={{ marginTop: '1rem', marginBottom: 0 }}>
            {[
              { key: 'active', label: t('appointments.tab_active') },
              { key: 'history', label: t('appointments.tab_history') }
            ].map(tab => (
              <button key={tab.key} className={`auth-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', maxWidth: '900px' }}>
            <div>
              {loading ? (
                <div className="table-empty"><div className="table-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><p>{t('appointments.loading')}</p></div>
              ) : filteredRdvs.length === 0 ? (
                <div className="table-empty"><div className="table-empty-icon"><CalendarIcon /></div><p>{t('appointments.empty')}</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredRdvs.map((rdv, index) => {
                    const d = fmtDate(rdv.appointment_date, locale)
                    const doc = doctors.find(dr => dr.id === rdv.doctor_id)
                    return (
                      <div key={rdv.id} className="info-card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', animationDelay: `${index * 50}ms` }}>
                        <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: 'white', borderRadius: 'var(--radius-md)', padding: '1.25rem 1.5rem', textAlign: 'center', minWidth: '100px' }}>
                          <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{d.day}</div>
                          <div style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.9 }}>{d.month}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          {isDoctor ? (
                            <>
                              <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>{d.full}</div>
                              <h4 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{rdv.patient_name || `Patient ${rdv.patient_id}`}</h4>
                              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ClockIcon /> {d.time}</p>
                              <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>{rdv.reason}</p>
                            </>
                          ) : (
                            <>
                              <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{doc?.name || `Dr. ${rdv.doctor_id}`}</h4>
                              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>{doc?.speciality}<ClockIcon /> {d.time}</p>
                              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{rdv.reason}</p>
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className={`status-badge status-${rdv.status}`}>{statusLabel(rdv.status)}</span>
                          {isDoctor && rdv.status === 'pending' && (
                            <>
                              <button onClick={() => handleAccept(rdv.id)}
                                style={{ padding: '0.6rem 1.25rem', background: 'rgba(0, 150, 136, 0.1)', color: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                                {t('appointments.accept')}
                              </button>
                              <button onClick={() => handleCancel(rdv.id)}
                                style={{ padding: '0.6rem 1.25rem', background: 'rgba(255, 82, 82, 0.1)', color: 'var(--error)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
                                {t('appointments.cancel')}
                              </button>
                            </>
                          )}
                          {isDoctor && rdv.status === 'confirmed' && (
                            <button onClick={() => handleCancel(rdv.id)}
                              style={{ padding: '0.6rem 1.25rem', background: 'rgba(255, 82, 82, 0.1)', color: 'var(--error)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
                              {t('appointments.cancel')}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {!isDoctor && (
              <div className="info-card" style={{ position: 'sticky', top: '2rem' }}>
                <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', padding: '1.5rem', margin: '-1px -1px 0 -1px', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                  <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.25rem' }}>{t('appointments.booking_title')}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>{t('appointments.booking_step').replace('{step}', step)}</p>
                </div>
                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem' }}>
                  {[1,2,3,4].map(s => (
                    <div key={s} style={{ flex: 1, height: '4px', borderRadius: 'var(--radius-full)', background: s <= step ? 'var(--primary)' : 'var(--border)' }} />
                  ))}
                </div>
                <div className="info-card-body">
                  {step === 1 && (
                    <div>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>{t('appointments.step_doctor')}</h4>
                      {doctors.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('appointments.no_doctors')}</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {doctors.map(doc => (
                            <div key={doc.id} onClick={() => { setForm({...form, doctor_id: doc.id}); setStep(2) }}
                              style={{ padding: '1rem', border: `2px solid ${form.doctor_id === doc.id ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'var(--transition-fast)' }}>
                              <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                                {doc.name.split(' ')[1]?.[0] || doc.name[0]}
                              </div>
                              <div><div style={{ fontWeight: 600 }}>{doc.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.speciality}</div></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {step === 2 && (
                    <div>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>{t('appointments.step_datetime')}</h4>
                      <div className="input-group">
                        <label>{t('appointments.step_date')}</label>
                        <input type="date" className="auth-input" min={minDate} value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ paddingLeft: '1rem' }} />
                      </div>
                      {form.date && (
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{t('appointments.step_time')}</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {TIME_SLOTS.map(t => (
                              <button key={t} onClick={() => { setForm({...form, time: t}); setStep(3) }}
                                style={{ padding: '0.5rem 1rem', border: `2px solid ${form.time === t ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: form.time === t ? 'var(--primary)' : 'white', color: form.time === t ? 'white' : 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button onClick={() => setStep(1)} style={{ marginTop: '1rem', color: 'var(--primary)', fontWeight: 500 }}>{t('appointments.step_back')}</button>
                    </div>
                  )}
                  {step === 3 && (
                    <div>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>{t('appointments.step_reason')}</h4>
                      <div className="input-group">
                        <textarea className="auth-input" placeholder={t('appointments.step_reason_placeholder')} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={4} style={{ paddingLeft: '1rem', resize: 'vertical' }} />
                      </div>
                      <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {[t('appointments.step_reason_tags'), t('appointments.step_reason_tags_emergency'), t('appointments.step_reason_tags_followup'), t('appointments.step_reason_tags_checkup')].map(tag => (
                          <button key={tag} onClick={() => setForm({...form, reason: form.reason ? `${form.reason}, ${tag}` : tag})}
                            style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', background: 'white', fontSize: '0.75rem', cursor: 'pointer' }}>
                            {tag}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setStep(2)} style={{ color: 'var(--primary)', fontWeight: 500 }}>{t('appointments.step_back')}</button>
                        <button onClick={() => setStep(4)} disabled={!form.reason} className="auth-submit" style={{ flex: 1, padding: '0.75rem' }}>{t('appointments.step_continue')}</button>
                      </div>
                    </div>
                  )}
                  {step === 4 && (
                    <div>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>{t('appointments.step_summary')}</h4>
                      <div style={{ background: 'var(--surface-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                        <p style={{ marginBottom: '0.5rem' }}><strong>{t('appointments.step_summary_doctor')}:</strong> {selectedDoctor?.name}</p>
                        <p style={{ marginBottom: '0.5rem' }}><strong>{t('appointments.step_summary_speciality')}:</strong> {selectedDoctor?.speciality}</p>
                        <p style={{ marginBottom: '0.5rem' }}><strong>{t('appointments.step_summary_date')}:</strong> {new Date(form.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <p style={{ marginBottom: '0.5rem' }}><strong>{t('appointments.step_summary_time')}:</strong> {form.time}</p>
                        <p><strong>{t('appointments.step_summary_reason')}:</strong> {form.reason}</p>
                      </div>
                      {success && (
                        <div className="auth-alert success" style={{ marginBottom: '1rem' }}><CheckIcon /> {success}</div>
                      )}
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setStep(3)} style={{ color: 'var(--primary)', fontWeight: 500 }}>{t('appointments.step_back')}</button>
                        <button onClick={handleSubmit} disabled={saving} className="auth-submit" style={{ flex: 1 }}>
                          {saving ? t('appointments.step_confirm_loading') : t('appointments.step_confirm')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}