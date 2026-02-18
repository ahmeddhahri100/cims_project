import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getUser, clearSession, isAuthenticated } from '../services/api'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = getUser()
  const authenticated = isAuthenticated()

  const handleLogout = () => {
    clearSession()
    navigate('/')
  }

  const loginLink = (
    <Link to="/" className="nav-link">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
      </svg>
      Connexion
    </Link>
  )

  const registerLink = (
    <Link to="/register" className="btn btn-primary btn-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="8.5" cy="7" r="4"/>
        <line x1="20" y1="8" x2="20" y2="14"/>
        <line x1="23" y1="11" x2="17" y2="11"/>
      </svg>
      Inscription
    </Link>
  )

  const userMenu = authenticated && (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div className="user-info">
        <div className="user-avatar">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <span className="user-name">{user?.firstName}</span>
      </div>
      <button 
        onClick={handleLogout} 
        className="nav-link" 
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#f87171' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Déconnexion
      </button>
    </div>
  )

  return (
    <>
      <div className="floating-shapes" />
      <header className="header">
        <div className="header-top">
          <div className="header-top-content">
            <div className="header-contact">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                REDACTED_PHONE
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                contact@cims.example
              </span>
            </div>
            <div style={{ display: 'flex', gap: '24px', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
              <span style={{ cursor: 'pointer' }}>APPELS D'OFFRES</span>
              <span style={{ cursor: 'pointer' }}>PROJETS</span>
              <span style={{ cursor: 'pointer' }}>ACTUALITÉS</span>
            </div>
          </div>
        </div>

        <div className="header-main">
          <Link to="/" className="logo">
            <div className="logo-icon">🏥</div>
            <div className="logo-text">
              <h1>CIMS</h1>
              <p>CIMS</p>
            </div>
          </Link>

          <nav className="header-nav">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Accueil
            </Link>
            
            {authenticated && (
              <>
                <Link
                  to="/profile"
                  className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Profil
                </Link>
                <Link
                  to="/appointments"
                  className={`nav-link ${location.pathname === '/appointments' ? 'active' : ''}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Rendez-vous
                </Link>
              </>
            )}

            {!authenticated ? (
              <>
                {location.pathname !== '/' && loginLink}
                {location.pathname !== '/register' && registerLink}
              </>
            ) : userMenu}

            <div 
              className="btn btn-sm" 
              style={{ 
                background: 'var(--bg-tertiary)', 
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '12px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              ACCÈS INFO
            </div>
          </nav>
        </div>
      </header>
    </>
  )
}
