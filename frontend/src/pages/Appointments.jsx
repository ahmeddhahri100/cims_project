import { useState, useEffect } from 'react'

// Icons
const DiamondIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 9l10 13 10-13-10-11z"/>
  </svg>
)

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const getUser = () => {
  const userStr = localStorage.getItem('cims_user')
  return userStr ? JSON.parse(userStr) : null
}

const DOCTORS = [
  { id: 'dr-001', name: 'Dr. Sana Mansour', speciality: 'Cardiologie' },
  { id: 'dr-002', name: 'Dr. Karim Trabelsi', speciality: 'Pédiatrie' },
  { id: 'dr-003', name: 'Dr. Leila Gharbi', speciality: 'Neurologie' },
  { id: 'dr-004', name: 'Dr. Mounir Belhaj', speciality: 'Dermatologie' },
  { id: 'dr-005', name: 'Dr. Ines Sfar', speciality: 'Gynécologie' },
]

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00'
]

function fmtDate(iso) {
  const d = new Date(iso)
  return {
    day: d.getDate(),
    month: d.toLocaleString('fr', { month: 'short' }),
    time: d.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })
  }
}

export default function Appointments() {
  const user = getUser()
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin'

  const [rdvs, setRdvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ doctor_id: '', date: '', time: '', reason: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      const token = localStorage.getItem('cims_token')
      const url = isDoctor 
        ? 'http://localhost:3003/api/rdv'
        : 'http://localhost:3003/api/rdv/my'
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setRdvs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading appointments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('cims_token')
    localStorage.removeItem('cims_user')
    window.location.href = '/'
  }

  const handleCancel = async (id) => {
    if (!confirm('Annuler ce rendez-vous ?')) return
    try {
      const token = localStorage.getItem('cims_token')
      await fetch(`http://localhost:3003/api/rdv/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      loadAppointments()
    } catch (err) {
      console.error('Error cancelling:', err)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('cims_token')
      const response = await fetch('http://localhost:3003/api/rdv', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_id: form.doctor_id,
          appointment_date: `${form.date}T${form.time}:00`,
          reason: form.reason,
          notes: form.notes
        })
      })
      
      const data = await response.json()
      if (data.id) {
        setSuccess('Rendez-vous confirmé !')
        setForm({ doctor_id: '', date: '', time: '', reason: '', notes: '' })
        setStep(1)
        loadAppointments()
      }
    } catch (err) {
      console.error('Error creating appointment:', err)
    } finally {
      setSaving(false)
    }
  }

  const filteredRdvs = rdvs.filter(r => {
    if (activeTab === 'all') return true
    if (activeTab === 'upcoming') return ['pending', 'confirmed'].includes(r.status)
    if (activeTab === 'past') return r.status === 'completed'
    if (activeTab === 'cancelled') return r.status === 'cancelled'
    return true
  })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const selectedDoctor = DOCTORS.find(d => d.id === form.doctor_id)

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon"><DiamondIcon /></div>
            <div className="sidebar-logo-text">
              <h3>CIMS</h3>
              <span>Santé</span>
            </div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <div className="sidebar-user-name">{user?.firstName} {user?.lastName}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <div className="sidebar-nav-title">Menu</div>
            <a href="/profile" className="sidebar-nav-item">
              <UserIcon /> Profil
            </a>
            <a href="/appointments" className="sidebar-nav-item active">
              <CalendarIcon /> Rendez-vous
              <span className="sidebar-nav-badge">{rdvs.filter(r => r.status === 'pending').length}</span>
            </a>
          </div>
        </nav>

        <div className="sidebar-logout">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <LogoutIcon /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          <div className="page-header">
            <h1 className="page-title">{isDoctor ? 'Tous les rendez-vous' : 'Mes rendez-vous'}</h1>
            <p className="page-subtitle">{filteredRdvs.length} rendez-vous</p>
          </div>

          {/* Tabs */}
          <div className="auth-tabs" style={{ marginBottom: '2rem' }}>
            {[
              { key: 'all', label: 'Tous' },
              { key: 'upcoming', label: 'À venir' },
              { key: 'past', label: 'Passés' },
              { key: 'cancelled', label: 'Annulés' }
            ].map(tab => (
              <button
                key={tab.key}
                className={`auth-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
            {/* Timeline */}
            <div>
              {loading ? (
                <div className="table-empty">
                  <div className="table-empty-icon">⏳</div>
                  <p>Chargement...</p>
                </div>
              ) : filteredRdvs.length === 0 ? (
                <div className="table-empty">
                  <div className="table-empty-icon">
                    <CalendarIcon />
                  </div>
                  <p>Aucun rendez-vous</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredRdvs.map((rdv, index) => {
                    const d = fmtDate(rdv.appointment_date)
                    const doc = DOCTORS.find(dr => dr.id === rdv.doctor_id)
                    return (
                      <div 
                        key={rdv.id}
                        className="info-card"
                        style={{ 
                          padding: '1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1.5rem',
                          animationDelay: `${index * 50}ms`
                        }}
                      >
                        {/* Date box */}
                        <div style={{
                          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                          color: 'white',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem 1.25rem',
                          textAlign: 'center',
                          minWidth: '70px'
                        }}>
                          <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>{d.day}</div>
                          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>{d.month}</div>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                            {doc?.name || `Dr. ${rdv.doctor_id}`}
                          </h4>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            {doc?.speciality} · 🕐 {d.time}
                          </p>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{rdv.reason}</p>
                        </div>

                        {/* Status & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span className={`status-badge status-${rdv.status}`}>
                            {rdv.status === 'pending' ? 'En attente' : rdv.status === 'confirmed' ? 'Confirmé' : rdv.status === 'cancelled' ? 'Annulé' : 'Terminé'}
                          </span>
                          {rdv.status === 'pending' && (
                            <button 
                              onClick={() => handleCancel(rdv.id)}
                              style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(255, 82, 82, 0.1)',
                                color: 'var(--error)',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Booking Panel */}
            {!isDoctor && (
              <div className="info-card" style={{ position: 'sticky', top: '2rem' }}>
                <div style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  padding: '1.5rem',
                  margin: '-1px -1px 0 -1px',
                  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
                }}>
                  <h3 style={{ color: 'white', fontSize: '1.25rem', marginBottom: '0.25rem' }}>Prendre rendez-vous</h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>Étape {step} sur 4</p>
                </div>

                {/* Progress */}
                <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4].map(s => (
                    <div 
                      key={s}
                      style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: 'var(--radius-full)',
                        background: s <= step ? 'var(--primary)' : 'var(--border)'
                      }}
                    />
                  ))}
                </div>

                <div className="info-card-body">
                  {/* Step 1: Doctor */}
                  {step === 1 && (
                    <div>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Choisir le médecin</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {DOCTORS.map(doc => (
                          <div
                            key={doc.id}
                            onClick={() => { setForm({...form, doctor_id: doc.id}); setStep(2) }}
                            style={{
                              padding: '1rem',
                              border: `2px solid ${form.doctor_id === doc.id ? 'var(--primary)' : 'var(--border)'}`,
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              transition: 'var(--transition-fast)'
                            }}
                          >
                            <div style={{
                              width: '40px',
                              height: '40px',
                              background: 'var(--primary)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 600
                            }}>
                              {doc.name.split(' ')[1][0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{doc.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.speciality}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Date & Time */}
                  {step === 2 && (
                    <div>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Choisir le créneau</h4>
                      <div className="input-group">
                        <label>Date</label>
                        <input
                          type="date"
                          className="auth-input"
                          min={minDate}
                          value={form.date}
                          onChange={e => setForm({...form, date: e.target.value})}
                          style={{ paddingLeft: '1rem' }}
                        />
                      </div>
                      {form.date && (
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Heure</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {TIME_SLOTS.map(t => (
                              <button
                                key={t}
                                onClick={() => { setForm({...form, time: t}); setStep(3) }}
                                style={{
                                  padding: '0.5rem 1rem',
                                  border: `2px solid ${form.time === t ? 'var(--primary)' : 'var(--border)'}`,
                                  borderRadius: 'var(--radius-sm)',
                                  background: form.time === t ? 'var(--primary)' : 'white',
                                  color: form.time === t ? 'white' : 'var(--text-primary)',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  cursor: 'pointer'
                                }}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <button onClick={() => setStep(1)} style={{ marginTop: '1rem', color: 'var(--primary)', fontWeight: 500 }}>
                        ← Retour
                      </button>
                    </div>
                  )}

                  {/* Step 3: Reason */}
                  {step === 3 && (
                    <div>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Motif de consultation</h4>
                      <div className="input-group">
                        <textarea
                          className="auth-input"
                          placeholder="Décrivez le motif de votre consultation..."
                          value={form.reason}
                          onChange={e => setForm({...form, reason: e.target.value})}
                          rows={4}
                          style={{ paddingLeft: '1rem', resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {['Consultation', 'Urgence', 'Suivi', 'Bilan'].map(tag => (
                          <button
                            key={tag}
                            onClick={() => setForm({...form, reason: form.reason ? `${form.reason}, ${tag}` : tag})}
                            style={{
                              padding: '0.5rem 1rem',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-full)',
                              background: 'white',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setStep(2)} style={{ color: 'var(--primary)', fontWeight: 500 }}>← Retour</button>
                        <button
                          onClick={() => setStep(4)}
                          disabled={!form.reason}
                          className="auth-submit"
                          style={{ flex: 1, padding: '0.75rem' }}
                        >
                          Continuer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Confirm */}
                  {step === 4 && (
                    <div>
                      <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Récapitulatif</h4>
                      <div style={{ background: 'var(--surface-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                        <p style={{ marginBottom: '0.5rem' }}><strong>Médecin:</strong> {selectedDoctor?.name}</p>
                        <p style={{ marginBottom: '0.5rem' }}><strong>Spécialité:</strong> {selectedDoctor?.speciality}</p>
                        <p style={{ marginBottom: '0.5rem' }}><strong>Date:</strong> {new Date(form.date).toLocaleDateString('fr', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <p style={{ marginBottom: '0.5rem' }}><strong>Heure:</strong> {form.time}</p>
                        <p><strong>Motif:</strong> {form.reason}</p>
                      </div>
                      {success && (
                        <div className="auth-alert success" style={{ marginBottom: '1rem' }}>
                          <CheckIcon /> {success}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setStep(3)} style={{ color: 'var(--primary)', fontWeight: 500 }}>← Retour</button>
                        <button
                          onClick={handleSubmit}
                          disabled={saving}
                          className="auth-submit"
                          style={{ flex: 1 }}
                        >
                          {saving ? 'Confirmation...' : 'Confirmer le rendez-vous'}
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
