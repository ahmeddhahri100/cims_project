import { useState, useEffect } from "react";
import "../calendar.css";

// Icons
const CalendarIcon = () => (
  <svg
    width="24"
    height="24"
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

const ChevronLeftIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UserIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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

// Helper functions
const getUser = () => {
  const userStr = localStorage.getItem("cims_user");
  return userStr ? JSON.parse(userStr) : null;
};

const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

const getStatusColor = (status) => {
  switch (status) {
    case "confirmed":
      return "#10b981";
    case "pending":
      return "#f59e0b";
    case "cancelled":
      return "#ef4444";
    case "completed":
      return "#3b82f6";
    default:
      return "#6b7280";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "confirmed":
      return "Confirmé";
    case "pending":
      return "En attente";
    case "cancelled":
      return "Annulé";
    case "completed":
      return "Terminé";
    default:
      return status;
  }
};

// Doctor mapping
const DOCTORS = {
  "dr-001": { name: "Dr. Sana Mansour", speciality: "Cardiologie" },
  "dr-002": { name: "Dr. Karim Trabelsi", speciality: "Pédiatrie" },
  "dr-003": { name: "Dr. Leila Gharbi", speciality: "Neurologie" },
  "dr-004": { name: "Dr. Mounir Belhaj", speciality: "Dermatologie" },
  "dr-005": { name: "Dr. Ines Sfar", speciality: "Gynécologie" },
};

export default function Calendar() {
  const user = getUser();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointments, setSelectedAppointments] = useState([]);

  // Load appointments
  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const token = localStorage.getItem("cims_token");
      const response = await fetch("http://localhost:3003/api/rdv/my", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setAppointments(data || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cims_token");
    localStorage.removeItem("cims_user");
    window.location.href = "/";
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointment_date);
      const aptDateStr = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, "0")}-${String(aptDate.getDate()).padStart(2, "0")}`;
      return aptDateStr === dateStr;
    });
  };

  // Handle date click
  const handleDateClick = (day) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    setSelectedDate(date);
    const dayAppointments = getAppointmentsForDate(day);
    setSelectedAppointments(dayAppointments);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const startDay = firstDay === 0 ? 6 : firstDay - 1;

    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const today = new Date();
  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  if (loading) {
    return (
      <div className="calendar-page">
        <div className="calendar-loading">
          <div className="spinner-large"></div>
          <p>Chargement du calendrier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      {/* Header */}
      <header className="calendar-header">
        <div className="calendar-header-content">
          <div className="calendar-logo">
            <div className="calendar-logo-icon">
              <CalendarIcon />
            </div>
            <div className="calendar-logo-text">
              <h1>CIMS Calendar</h1>
              <span>Mes rendez-vous</span>
            </div>
          </div>

          <div className="calendar-header-actions">
            <span className="calendar-user">
              <UserIcon />
              {user?.firstName} {user?.lastName}
            </span>
            <button
              className="calendar-nav-btn"
              onClick={() => (window.location.href = "/appointments")}
            >
              Gérer les RDV
            </button>
            <button className="calendar-logout-btn" onClick={handleLogout}>
              <LogoutIcon />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="calendar-main">
        <div className="calendar-container">
          {/* Calendar Navigation */}
          <div className="calendar-nav">
            <button className="calendar-nav-arrow" onClick={prevMonth}>
              <ChevronLeftIcon />
            </button>
            <div className="calendar-current-month">
              <h2>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
            </div>
            <button className="calendar-nav-arrow" onClick={nextMonth}>
              <ChevronRightIcon />
            </button>
            <button className="calendar-today-btn" onClick={goToToday}>
              Aujourd'hui
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid-container">
            {/* Day headers */}
            <div className="calendar-day-headers">
              {dayNames.map((day) => (
                <div key={day} className="calendar-day-header">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="calendar-days">
              {generateCalendarDays().map((day, index) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="calendar-day empty"
                    ></div>
                  );
                }

                const dayAppointments = getAppointmentsForDate(day);
                const hasAppointments = dayAppointments.length > 0;

                return (
                  <div
                    key={day}
                    className={`calendar-day ${isToday(day) ? "today" : ""} ${hasAppointments ? "has-appointments" : ""} ${selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth() ? "selected" : ""}`}
                    onClick={() => handleDateClick(day)}
                  >
                    <span className="calendar-day-number">{day}</span>
                    {hasAppointments && (
                      <div className="calendar-appointment-dots">
                        {dayAppointments.slice(0, 3).map((apt, i) => (
                          <div
                            key={i}
                            className="calendar-appointment-dot"
                            style={{
                              backgroundColor: getStatusColor(apt.status),
                            }}
                          ></div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <span className="calendar-more-dots">
                            +{dayAppointments.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="calendar-legend">
            <div className="calendar-legend-item">
              <span
                className="calendar-legend-dot"
                style={{ backgroundColor: "#10b981" }}
              ></span>
              Confirmé
            </div>
            <div className="calendar-legend-item">
              <span
                className="calendar-legend-dot"
                style={{ backgroundColor: "#f59e0b" }}
              ></span>
              En attente
            </div>
            <div className="calendar-legend-item">
              <span
                className="calendar-legend-dot"
                style={{ backgroundColor: "#ef4444" }}
              ></span>
              Annulé
            </div>
            <div className="calendar-legend-item">
              <span
                className="calendar-legend-dot"
                style={{ backgroundColor: "#3b82f6" }}
              ></span>
              Terminé
            </div>
          </div>
        </div>

        {/* Selected Date Panel */}
        {selectedDate && (
          <div className="calendar-detail-panel">
            <div className="calendar-detail-header">
              <h3>{formatDate(selectedDate)}</h3>
              <button
                className="calendar-close-btn"
                onClick={() => setSelectedDate(null)}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="calendar-detail-content">
              {selectedAppointments.length === 0 ? (
                <div className="calendar-no-appointments">
                  <CalendarIcon />
                  <p>Aucun rendez-vous ce jour</p>
                  <button
                    onClick={() => (window.location.href = "/appointments")}
                  >
                    Prendre rendez-vous
                  </button>
                </div>
              ) : (
                <div className="calendar-appointment-list">
                  {selectedAppointments.map((apt) => (
                    <div key={apt.id} className="calendar-appointment-card">
                      <div className="calendar-appointment-time">
                        <ClockIcon />
                        <span>{formatTime(apt.appointment_date)}</span>
                      </div>
                      <div className="calendar-appointment-details">
                        <div className="calendar-appointment-doctor">
                          {DOCTORS[apt.doctor_id]?.name || apt.doctor_id}
                        </div>
                        <div className="calendar-appointment-speciality">
                          {DOCTORS[apt.doctor_id]?.speciality || ""}
                        </div>
                        <div className="calendar-appointment-reason">
                          {apt.reason}
                        </div>
                        {apt.notes && (
                          <div className="calendar-appointment-notes">
                            {apt.notes}
                          </div>
                        )}
                      </div>
                      <div
                        className="calendar-appointment-status"
                        style={{ backgroundColor: getStatusColor(apt.status) }}
                      >
                        {getStatusLabel(apt.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
