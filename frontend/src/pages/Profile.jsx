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

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
)

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// Get user from localStorage
const getUser = () => {
  const userStr = localStorage.getItem('cims_user')
  return userStr ? JSON.parse(userStr) : null
}

// Generate avatar color from name
const getAvatarColor = (name) => {
  const colors = ['#009688', '#00BCD4', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#3F51B5', '#795548']
  const index = name?.charCodeAt(0) % colors.length || 0
  return colors[index]
}

// Generate blood type class
const getBloodClass = (bloodType) => {
  if (!bloodType) return ''
  return bloodType.toLowerCase().replace('+', 'pos').replace('-', 'neg')
}

export default function Profile() {
  const user = getUser()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newPatient, setNewPatient] = useState({
    firstName: '', lastName: '', email: '', phone: '', bloodType: ''
  })

  const isDoctor = user?.role === 'doctor' || user?.role === 'admin'

  useEffect(() => {
    if (isDoctor) {
      fetchPatients()
    }
  }, [])

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('cims_token')
      const response = await fetch('http://localhost:3002/api/patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setPatients(data.patients || [])
    } catch (err) {
      console.error('Error fetching patients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('cims_token')
    localStorage.removeItem('cims_user')
    window.location.href = '/'
  }

  const handleCreatePatient = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('cims_token')
      await fetch('http://localhost:3002/api/patients', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPatient)
      })
      setShowModal(false)
      setNewPatient({ firstName: '', lastName: '', email: '', phone: '', bloodType: '' })
      fetchPatients()
    } catch (err) {
      console.error('Error creating patient:', err)
    }
  }

  const filteredPatients = patients.filter(p => 
    p.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <DiamondIcon />
            </div>
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
            <a href="/profile" className="sidebar-nav-item active">
              <UserIcon /> Profil
            </a>
            {isDoctor && (
              <a href="#" className="sidebar-nav-item">
                <FileIcon /> Patients
                <span className="sidebar-nav-badge">{patients.length}</span>
              </a>
            )}
          </div>
        </nav>

        <div className="sidebar-services">
          <div className="sidebar-nav-title">Services</div>
          <a href="http://localhost:3001" className="sidebar-service-link" target="_blank">
            <span>🔐</span> Auth Service
          </a>
          <a href="http://localhost:3003" className="sidebar-service-link" target="_blank">
            <span>📅</span> RDV Service
          </a>
        </div>

        <div className="sidebar-logout">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <LogoutIcon /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Hero Card */}
          <div className="hero-card">
            <div className="hero-avatar">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="hero-info">
              <h1 className="hero-name">{user?.firstName} {user?.lastName}</h1>
              <p className="hero-email">{user?.email}</p>
              <span className="hero-role">{user?.role}</span>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">12</span>
                <span className="hero-stat-label">RDV à venir</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">48</span>
                <span className="hero-stat-label">Consultations</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">3</span>
                <span className="hero-stat-label">Ce mois</span>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="info-grid">
            <div className="info-card">
              <div className="info-card-header">
                <h3 className="info-card-title">Informations personnelles</h3>
                <span className="info-card-action">Modifier</span>
              </div>
              <div className="info-card-body">
                <div className="info-row">
                  <span className="info-label">Prénom</span>
                  <span className="info-value">{user?.firstName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Nom</span>
                  <span className="info-value">{user?.lastName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{user?.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Rôle</span>
                  <span className="info-value" style={{ textTransform: 'capitalize' }}>{user?.role}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-header">
                <h3 className="info-card-title">Sécurité du compte</h3>
              </div>
              <div className="info-card-body">
                <div className="security-toggle">
                  <div className="security-toggle-info">
                    <h4>Mot de passe</h4>
                    <p>Dernière modification: il y a 30 jours</p>
                  </div>
                  <span className="info-card-action">Modifier</span>
                </div>
                <div className="security-toggle">
                  <div className="security-toggle-info">
                    <h4>Authentification à deux facteurs</h4>
                    <p>Ajoutez une couche de sécurité supplémentaire</p>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="security-toggle">
                  <div className="security-toggle-info">
                    <h4>Sessions actives</h4>
                    <p>Gérez vos sessions sur tous les appareils</p>
                  </div>
                  <span className="info-card-action">Voir</span>
                </div>
              </div>
            </div>
          </div>

          {/* Patients Table */}
          {isDoctor && (
            <div className="table-card">
              <div className="table-header">
                <h3 className="table-title">Patients</h3>
                <div className="table-actions">
                  <div className="search-input">
                    <SearchIcon />
                    <input 
                      type="text" 
                      placeholder="Rechercher un patient..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="add-btn" onClick={() => setShowModal(true)}>
                    <PlusIcon /> Nouveau
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="table-empty">
                  <div className="table-empty-icon">⏳</div>
                  <p>Chargement...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="table-empty">
                  <div className="table-empty-icon">
                    <FileIcon />
                  </div>
                  <p>Aucun patient trouvé</p>
                </div>
              ) : (
                <table className="patients-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Email</th>
                      <th>Téléphone</th>
                      <th>Groupe sanguin</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((patient) => (
                      <tr key={patient.id}>
                        <td>
                          <div className="patient-cell">
                            <div 
                              className="patient-avatar"
                              style={{ background: getAvatarColor(patient.first_name) }}
                            >
                              {patient.first_name?.[0]}{patient.last_name?.[0]}
                            </div>
                            <div>
                              <div className="patient-name">{patient.first_name} {patient.last_name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{patient.email || '—'}</td>
                        <td>{patient.phone || '—'}</td>
                        <td>
                          {patient.blood_type && (
                            <span className={`blood-badge ${getBloodClass(patient.blood_type)}`}>
                              {patient.blood_type}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="table-actions-cell">
                            <button className="action-btn" title="Voir"><EyeIcon /></button>
                            <button className="action-btn" title="Modifier"><EditIcon /></button>
                            <button className="action-btn delete" title="Supprimer"><TrashIcon /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create Patient Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Nouveau Patient</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleCreatePatient}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="input-group">
                    <input type="text" className="auth-input" placeholder=" " value={newPatient.firstName} onChange={(e) => setNewPatient({...newPatient, firstName: e.target.value})} required />
                    <label className="floating-label"><span>Prénom</span></label>
                  </div>
                  <div className="input-group">
                    <input type="text" className="auth-input" placeholder=" " value={newPatient.lastName} onChange={(e) => setNewPatient({...newPatient, lastName: e.target.value})} required />
                    <label className="floating-label"><span>Nom</span></label>
                  </div>
                </div>
                <div className="input-group" style={{ marginBottom: '1rem' }}>
                  <input type="email" className="auth-input" placeholder=" " value={newPatient.email} onChange={(e) => setNewPatient({...newPatient, email: e.target.value})} />
                  <label className="floating-label"><span>Email</span></label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <input type="tel" className="auth-input" placeholder=" " value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} />
                    <label className="floating-label"><span>Téléphone</span></label>
                  </div>
                  <select className="auth-select" value={newPatient.bloodType} onChange={(e) => setNewPatient({...newPatient, bloodType: e.target.value})} style={{ paddingLeft: '1rem' }}>
                    <option value="">Groupe sanguin</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn cancel" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="modal-btn submit">Créer le patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
