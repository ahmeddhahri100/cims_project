import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next'
import "../profile.css";

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M3 10h18" />
  </svg>
)
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)
const PatientsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)


const getUser = () => {
  const userStr = localStorage.getItem("cims_user");
  return userStr ? JSON.parse(userStr) : null;
}

const getAvatarColor = (name) => {
  const colors = ["#009688", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];
  return colors[name ? name.charCodeAt(0) % colors.length : 0];
}

export default function Profile() {
  const { t, i18n } = useTranslation()
  const user = getUser();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPatients, setShowPatients] = useState(true);


  const isDoctor = user?.role === "doctor" || user?.role === "admin";
  const isPatient = user?.role === "patient";
  const doctorId = localStorage.getItem('cims_doctor_id')

  useEffect(() => {
    loadDoctors()
    fetchData();
  }, []);

  useEffect(() => {
    const findOrCreateDoctor = async () => {
      if (!isDoctor || doctorId || localStorage.getItem('cims_doctor_creating')) return
      localStorage.setItem('cims_doctor_creating', '1')

      const token = localStorage.getItem('cims_token')

      // Load existing doctors
      let doctorsList = doctors
      if (doctorsList.length === 0) {
        try {
          const res = await fetch('/api/rdv/doctors', { headers: { Authorization: `Bearer ${token}` } })
          doctorsList = await res.json()
          if (!Array.isArray(doctorsList)) doctorsList = []
        } catch { doctorsList = [] }
      }

      // Find doctor matching by email
      const userEmail = user?.email
      const match = doctorsList.find(d => d.email === userEmail)
      if (match) {
        localStorage.setItem('cims_doctor_id', match.id)
        localStorage.removeItem('cims_doctor_creating')
        window.location.reload()
        return
      }

      // Not found — create one
      try {
        const res = await fetch('/api/rdv/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Dr. Unknown',
            speciality: 'Généraliste',
            email: userEmail
          })
        })
        const created = await res.json()
        if (created?.id) {
          localStorage.setItem('cims_doctor_id', created.id)
          window.location.reload()
        }
      } catch {}
      localStorage.removeItem('cims_doctor_creating')
    }
    findOrCreateDoctor()
  }, [isDoctor, doctorId]);

  const loadDoctors = async () => {
    try {
      const token = localStorage.getItem('cims_token')
      const res = await fetch('/api/rdv/doctors', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setDoctors(Array.isArray(data) ? data : [])
    } catch {}
  }

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("cims_token");
      if (isDoctor) {
        const patientsRes = await fetch("/api/rdv/patients", { headers: { Authorization: `Bearer ${token}` } })
        const patientsData = await patientsRes.json();
        setPatients(patientsData.patients || []);
      }
      const rdvUrl = isDoctor
        ? `/api/rdv${doctorId ? `?doctor_id=${doctorId}` : ''}`
        : "/api/rdv/my";
      const rdvRes = await fetch(rdvUrl, { headers: { Authorization: `Bearer ${token}` } })
      const rdvData = await rdvRes.json();
      setAppointments(rdvData || []);
    } catch (err) { console.error("Error fetching data:", err);
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("cims_token");
    localStorage.removeItem("cims_user");
    localStorage.removeItem("cims_doctor_id");
    window.location.href = "/";
  };

  const pendingAppointments = appointments.filter(a => a.status === "pending").length;
  const confirmedAppointments = appointments.filter(a => a.status === "confirmed" || a.status === "completed").length;
  const cancelledAppointments = appointments.filter(a => a.status === "cancelled").length;

  const myPatientIds = [...new Set(appointments.map(a => String(a.patient_id)).filter(Boolean))];
  const myPatients = patients.filter(p => myPatientIds.includes(String(p.id)));

  const selectedDoctorName = doctors.find(d => d.id === doctorId)?.name

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
            <span className="profile-user-badge"><UserIcon />{user?.firstName} {user?.lastName}</span>
            <button className="profile-logout-btn" onClick={handleLogout}><LogoutIcon />{t('profile.logout')}</button>
          </div>
        </div>
      </header>

      <main className="profile-main">
        <div className="profile-container">
          <div className="profile-user-card">
            <div className="profile-avatar" style={{ background: getAvatarColor(user?.firstName) }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="profile-user-info">
              <h2>{user?.firstName} {user?.lastName}</h2>
              <p className="profile-email">{user?.email}</p>
              <span className={`profile-role role-${user?.role}`}>
                {user?.role === "patient" ? t('profile.role_patient') : user?.role === "doctor" ? t('profile.role_doctor') : t('profile.role_admin')}
              </span>
                  {isDoctor && doctorId && (
                <span className="profile-role" style={{ background: 'var(--bg-tertiary)', marginLeft: '8px', fontSize: '0.75rem' }}>
                  {selectedDoctorName}
                </span>
              )}
            </div>
          </div>

          {!loading && (
            <div className="profile-stats">
              <div className="profile-stat-card stat-appointments">
                <div className="stat-icon stat-icon-primary"><CalendarIcon /></div>
                <div className="stat-info">
                  <span className="stat-label">{t('profile.stats_appointments')}</span>
                  <span className="stat-value">{appointments.length}</span>
                </div>
              </div>
              {!isDoctor && (
                <div className="profile-stat-card stat-pending">
                  <div className="stat-icon stat-icon-warning"><ClockIcon /></div>
                  <div className="stat-info">
                    <span className="stat-label">{t('profile.stats_pending')}</span>
                    <span className="stat-value">{pendingAppointments}</span>
                  </div>
                </div>
              )}
              {isDoctor && (
                <>
                  <div className="profile-stat-card stat-confirmed">
                    <div className="stat-icon stat-icon-success"><CalendarIcon /></div>
                    <div className="stat-info">
                      <span className="stat-label">{t('profile.stats_confirmed')}</span>
                      <span className="stat-value">{confirmedAppointments}</span>
                    </div>
                  </div>
                  <div className="profile-stat-card stat-pending">
                    <div className="stat-icon stat-icon-warning"><ClockIcon /></div>
                    <div className="stat-info">
                      <span className="stat-label">{t('profile.stats_pending')}</span>
                      <span className="stat-value">{pendingAppointments}</span>
                    </div>
                  </div>
                  <div className="profile-stat-card stat-cancelled">
                    <div className="stat-icon stat-icon-danger"><ClockIcon /></div>
                    <div className="stat-info">
                      <span className="stat-label">{t('profile.stats_cancelled')}</span>
                      <span className="stat-value">{cancelledAppointments}</span>
                    </div>
                  </div>
                  <div className="profile-stat-card stat-patients">
                    <div className="stat-icon stat-icon-info"><PatientsIcon /></div>
                    <div className="stat-info">
                      <span className="stat-label">{t('profile.stats_patients')}</span>
                      <span className="stat-value">{myPatients.length}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="profile-actions">
            {isPatient && (
              <>
                <a href="/calendar" className="profile-action-btn primary"><CalendarIcon />{t('profile.action_calendar')}</a>
                <a href="/appointments" className="profile-action-btn"><ClockIcon />{t('profile.action_manage_appointments')}</a>
              </>
            )}
            {isDoctor && (
              <a href="/appointments" className="profile-action-btn primary"><CalendarIcon />{t('profile.action_manage_appointments_doctor')}</a>
            )}
          </div>

          {isDoctor && showPatients && (
            <div className="profile-patients-section">
              <h3>{t('profile.patients_title')} ({myPatients.length})</h3>
              {loading ? (
                <div className="profile-loading"><div className="spinner"></div><p>{t('profile.loading')}</p></div>
              ) : myPatients.length === 0 ? (
                <div className="profile-empty"><p>{t('profile.patients_empty')}</p></div>
              ) : (
                <div className="profile-patients-list">
                  {myPatients.map((patient) => (
                    <div key={patient.id} className="profile-patient-item">
                      <div className="patient-avatar-small" style={{ background: getAvatarColor(patient.first_name) }}>
                        {patient.first_name?.[0]}{patient.last_name?.[0]}
                      </div>
                      <div className="patient-info">
                        <span className="patient-name">{patient.first_name} {patient.last_name}</span>
                        <span className="patient-email">{patient.email || patient.phone || t('profile.patients_no_contact')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="profile-info-section">
            <h3>{t('profile.info_title')}</h3>
            <div className="profile-info-grid">
              <div className="profile-info-item"><span className="info-label">{t('profile.info_firstname')}</span><span className="info-value">{user?.firstName}</span></div>
              <div className="profile-info-item"><span className="info-label">{t('profile.info_lastname')}</span><span className="info-value">{user?.lastName}</span></div>
              <div className="profile-info-item"><span className="info-label">{t('profile.info_email')}</span><span className="info-value">{user?.email}</span></div>
              <div className="profile-info-item"><span className="info-label">{t('profile.info_role')}</span><span className="info-value">{user?.role}</span></div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
