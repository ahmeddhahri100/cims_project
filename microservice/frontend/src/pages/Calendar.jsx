import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next'
import "../calendar.css";
import "../profile.css";

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M3 10h18" />
  </svg>
)
const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
)
const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
)
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const getUser = () => {
  const userStr = localStorage.getItem("cims_user");
  return userStr ? JSON.parse(userStr) : null;
}

export default function Calendar() {
  const { t, i18n } = useTranslation()
  const user = getUser()
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin'
  const doctorId = localStorage.getItem('cims_doctor_id')
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedAppointments, setSelectedAppointments] = useState([])

  useEffect(() => {
    loadDoctors()
    loadAppointments()
  }, [])

  const loadDoctors = async () => {
    try {
      const token = localStorage.getItem("cims_token")
      const res = await fetch('/api/rdv/doctors', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setDoctors(Array.isArray(data) ? data : [])
    } catch {}
  }

  const loadAppointments = async () => {
    try {
      const token = localStorage.getItem("cims_token")
      const url = isDoctor
        ? `/api/rdv${doctorId ? `?doctor_id=${doctorId}` : ''}`
        : "/api/rdv/my"
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      setAppointments(data || [])
    } catch (error) { console.error("Error loading appointments:", error)
    } finally { setLoading(false) }
  }

  const handleLogout = () => {
    localStorage.removeItem("cims_token")
    localStorage.removeItem("cims_user")
    window.location.href = "/"
  }

  const locale = i18n.language

  const formatDate = (date) => {
    const d = new Date(date)
    return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })
  }

  const formatTime = (date) => {
    const d = new Date(date)
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed": return "#10b981"
      case "pending": return "#f59e0b"
      case "cancelled": return "#ef4444"
      case "completed": return "#3b82f6"
      default: return "#6b7280"
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "confirmed": return t('calendar.legend_confirmed')
      case "pending": return t('calendar.legend_pending')
      case "cancelled": return t('calendar.legend_cancelled')
      case "completed": return t('calendar.legend_completed')
      default: return status
    }
  }

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()) }

  const getAppointmentsForDate = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.appointment_date);
      const aptDateStr = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, "0")}-${String(aptDate.getDate()).padStart(2, "0")}`;
      return aptDateStr === dateStr;
    });
  }

  const handleDateClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    setSelectedAppointments(getAppointmentsForDate(day));
  }

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  }

  const monthNames = locale === 'fr'
    ? ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
    : ["January","February","March","April","May","June","July","August","September","October","November","December"]
  const dayNames = locale === 'fr'
    ? ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"]
    : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

  const today = new Date()
  const isToday = (day) => day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()

  const doctorsMap = Object.fromEntries(doctors.map(d => [d.id, d]))

  if (loading) {
    return (
      <div className="profile-page">
        <div className="calendar-loading">
          <div className="spinner-large"></div>
          <p>{t('calendar.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-header-content">
          <div className="profile-logo">
            <img src="/image/logo-cims2021.png" alt="CIMS" style={{ height: '50px', width: 'auto' }} />
          </div>
          <div className="profile-header-actions">
            <button className="profile-lang-btn" onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}>
              {i18n.language === 'fr' ? 'EN' : 'FR'}
            </button>
            <span className="profile-user-badge"><UserIcon />{user?.firstName} {user?.lastName}</span>
            <button className="profile-logout-btn" onClick={handleLogout}><LogoutIcon />{t('profile.logout')}</button>
            <button className="profile-nav-btn" onClick={() => window.location.href = "/appointments"}>{t('calendar.manage_rdv')}</button>
          </div>
        </div>
      </header>

      <main className="calendar-main">
        <div className="calendar-container">
          <div className="calendar-nav">
            <button className="calendar-nav-arrow" onClick={prevMonth}><ChevronLeftIcon /></button>
            <div className="calendar-current-month"><h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2></div>
            <button className="calendar-nav-arrow" onClick={nextMonth}><ChevronRightIcon /></button>
            <button className="calendar-today-btn" onClick={goToToday}>{t('calendar.today')}</button>
          </div>

          <div className="calendar-grid-container">
            <div className="calendar-day-headers">
              {dayNames.map((day) => (<div key={day} className="calendar-day-header">{day}</div>))}
            </div>
            <div className="calendar-days">
              {generateCalendarDays().map((day, index) => {
                if (day === null) return <div key={`empty-${index}`} className="calendar-day empty"></div>
                const dayAppointments = getAppointmentsForDate(day);
                const hasAppointments = dayAppointments.length > 0;
                return (
                  <div key={day} className={`calendar-day ${isToday(day) ? "today" : ""} ${hasAppointments ? "has-appointments" : ""} ${selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth() ? "selected" : ""}`}
                    onClick={() => handleDateClick(day)}>
                    <span className="calendar-day-number">{day}</span>
                    {hasAppointments && (
                      <div className="calendar-appointment-dots">
                        {dayAppointments.slice(0, 3).map((apt, i) => (
                          <div key={i} className="calendar-appointment-dot" style={{ backgroundColor: getStatusColor(apt.status) }}></div>
                        ))}
                        {dayAppointments.length > 3 && <span className="calendar-more-dots">+{dayAppointments.length - 3}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="calendar-legend">
            <div className="calendar-legend-item"><span className="calendar-legend-dot" style={{ backgroundColor: "#10b981" }}></span>{t('calendar.legend_confirmed')}</div>
            <div className="calendar-legend-item"><span className="calendar-legend-dot" style={{ backgroundColor: "#f59e0b" }}></span>{t('calendar.legend_pending')}</div>
            <div className="calendar-legend-item"><span className="calendar-legend-dot" style={{ backgroundColor: "#ef4444" }}></span>{t('calendar.legend_cancelled')}</div>
            <div className="calendar-legend-item"><span className="calendar-legend-dot" style={{ backgroundColor: "#3b82f6" }}></span>{t('calendar.legend_completed')}</div>
          </div>
        </div>

        {selectedDate && (
          <div className="calendar-detail-panel">
            <div className="calendar-detail-header">
              <h3>{formatDate(selectedDate)}</h3>
              <button className="calendar-close-btn" onClick={() => setSelectedDate(null)}><CloseIcon /></button>
            </div>
            <div className="calendar-detail-content">
              {selectedAppointments.length === 0 ? (
                <div className="calendar-no-appointments">
                  <CalendarIcon />
                  <p>{t('calendar.no_appointments')}</p>
                  <button onClick={() => window.location.href = "/appointments"}>{t('calendar.take_appointment')}</button>
                </div>
              ) : (
                <div className="calendar-appointment-list">
                  {selectedAppointments.map((apt) => (
                    <div key={apt.id} className="calendar-appointment-card">
                      <div className="calendar-appointment-time"><ClockIcon /><span>{formatTime(apt.appointment_date)}</span></div>
                      <div className="calendar-appointment-details">
                        <div className="calendar-appointment-doctor">{doctorsMap[apt.doctor_id]?.name || apt.doctor_id}</div>
                        <div className="calendar-appointment-speciality">{doctorsMap[apt.doctor_id]?.speciality || ""}</div>
                        <div className="calendar-appointment-reason">{apt.reason}</div>
                        {apt.notes && <div className="calendar-appointment-notes">{apt.notes}</div>}
                      </div>
                      <div className="calendar-appointment-status" style={{ backgroundColor: getStatusColor(apt.status) }}>
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