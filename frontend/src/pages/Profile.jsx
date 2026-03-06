import { useState, useEffect } from "react";
import "../profile.css";

// Icons
const UserIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <path d="M3 10h18" />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const PatientsIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const EditIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// Helper
const getUser = () => {
  const userStr = localStorage.getItem("cims_user");
  return userStr ? JSON.parse(userStr) : null;
};

const getAvatarColor = (name) => {
  const colors = ["#009688", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

export default function Profile() {
  const user = getUser();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  const isDoctor = user?.role === "doctor" || user?.role === "admin";
  const isPatient = user?.role === "patient";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("cims_token");

      // Fetch patients (for doctors)
      if (isDoctor) {
        const patientsRes = await fetch(
          "http://localhost:3003/api/rdv/patients",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const patientsData = await patientsRes.json();
        setPatients(patientsData.patients || []);
      }

      // Fetch appointments
      const rdvUrl = isDoctor
        ? "http://localhost:3003/api/rdv"
        : "http://localhost:3003/api/rdv/my";

      const rdvRes = await fetch(rdvUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rdvData = await rdvRes.json();
      setAppointments(rdvData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cims_token");
    localStorage.removeItem("cims_user");
    window.location.href = "/";
  };

  // Count appointments by status
  const pendingAppointments = appointments.filter(
    (a) => a.status === "pending",
  ).length;
  const confirmedAppointments = appointments.filter(
    (a) => a.status === "confirmed",
  ).length;

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="profile-header">
        <div className="profile-header-content">
          <div className="profile-logo">
            <div className="profile-logo-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
              </svg>
            </div>
            <div className="profile-logo-text">
              <h1>CIMS</h1>
              <span>Santé Numérique</span>
            </div>
          </div>

          <div className="profile-header-actions">
            <span className="profile-user-badge">
              <UserIcon />
              {user?.firstName} {user?.lastName}
            </span>
            <button className="profile-logout-btn" onClick={handleLogout}>
              <LogoutIcon />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="profile-main">
        <div className="profile-container">
          {/* User Card */}
          <div className="profile-user-card">
            <div
              className="profile-avatar"
              style={{ background: getAvatarColor(user?.firstName) }}
            >
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="profile-user-info">
              <h2>
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="profile-email">{user?.email}</p>
              <span className={`profile-role role-${user?.role}`}>
                {user?.role === "patient"
                  ? "Patient"
                  : user?.role === "doctor"
                    ? "Médecin"
                    : "Administrateur"}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          {!loading && (
            <div className="profile-stats">
              <div className="profile-stat-card">
                <div className="stat-icon stat-icon-primary">
                  <CalendarIcon />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{appointments.length}</span>
                  <span className="stat-label">Rendez-vous</span>
                </div>
              </div>
              <div className="profile-stat-card">
                <div className="stat-icon stat-icon-warning">
                  <ClockIcon />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{pendingAppointments}</span>
                  <span className="stat-label">En attente</span>
                </div>
              </div>
              {isDoctor && (
                <div className="profile-stat-card">
                  <div className="stat-icon stat-icon-success">
                    <PatientsIcon />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{patients.length}</span>
                    <span className="stat-label">Patients</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="profile-actions">
            {isPatient && (
              <>
                <a href="/calendar" className="profile-action-btn primary">
                  <CalendarIcon />
                  Voir mon calendrier
                </a>
                <a href="/appointments" className="profile-action-btn">
                  <ClockIcon />
                  Gérer mes rendez-vous
                </a>
              </>
            )}
            {isDoctor && (
              <>
                <a href="/appointments" className="profile-action-btn primary">
                  <CalendarIcon />
                  Gérer les rendez-vous
                </a>
                <button
                  className="profile-action-btn"
                  onClick={() =>
                    setActiveTab(activeTab === "patients" ? "info" : "patients")
                  }
                >
                  <PatientsIcon />
                  Voir les patients
                </button>
              </>
            )}
          </div>

          {/* Patient List for Doctors */}
          {isDoctor && activeTab === "patients" && (
            <div className="profile-patients-section">
              <h3>Liste des patients</h3>
              {loading ? (
                <div className="profile-loading">
                  <div className="spinner"></div>
                  <p>Chargement...</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="profile-empty">
                  <p>Aucun patient enregistré</p>
                </div>
              ) : (
                <div className="profile-patients-list">
                  {patients.map((patient) => (
                    <div key={patient.id} className="profile-patient-item">
                      <div
                        className="patient-avatar-small"
                        style={{
                          background: getAvatarColor(patient.first_name),
                        }}
                      >
                        {patient.first_name?.[0]}
                        {patient.last_name?.[0]}
                      </div>
                      <div className="patient-info">
                        <span className="patient-name">
                          {patient.first_name} {patient.last_name}
                        </span>
                        <span className="patient-email">{patient.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Personal Info */}
          <div className="profile-info-section">
            <h3>Informations personnelles</h3>
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <span className="info-label">Prénom</span>
                <span className="info-value">{user?.firstName}</span>
              </div>
              <div className="profile-info-item">
                <span className="info-label">Nom</span>
                <span className="info-value">{user?.lastName}</span>
              </div>
              <div className="profile-info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="profile-info-item">
                <span className="info-label">Rôle</span>
                <span className="info-value">{user?.role}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
