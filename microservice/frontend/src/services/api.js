// API URLs - using relative URLs for proxy or full URLs for direct access
const API_BASE = {
  auth: '',
  patient: '',
  rdv: ''
}

// Helper to get token
export function getToken() {
  return localStorage.getItem('cims_token')
}

// Helper to get user
export function getUser() {
  const userStr = localStorage.getItem('cims_user')
  return userStr ? JSON.parse(userStr) : null
}

// Helper to check authentication
export function isAuthenticated() {
  return !!getToken()
}

// Save session
export function saveSession(token, user) {
  localStorage.setItem('cims_token', token)
  localStorage.setItem('cims_user', JSON.stringify(user))
}

// Clear session
export function clearSession() {
  localStorage.removeItem('cims_token')
  localStorage.removeItem('cims_user')
}

// API helper with auth header
async function apiCall(url, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  })
  
  if (response.status === 401) {
    clearSession()
    window.location.href = '/'
    return null
  }
  
  return response.json()
}

// Auth API
export async function apiLogin(email, password) {
  const response = await fetch(`${API_BASE.auth}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  return response.json()
}

export async function apiRegister(userData) {
  const response = await fetch(`${API_BASE.auth}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  })
  return response.json()
}

// Patients API
export async function fetchPatients() {
  return apiCall(`${API_BASE.patient}/api/patients`)
}

export async function createPatient(patientData) {
  return apiCall(`${API_BASE.patient}/api/patients`, {
    method: 'POST',
    body: JSON.stringify(patientData)
  })
}

export async function deletePatient(id) {
  return apiCall(`${API_BASE.patient}/api/patients/${id}`, {
    method: 'DELETE'
  })
}

// Doctors API
export async function fetchDoctors() {
  return apiCall(`${API_BASE.rdv}/api/rdv/doctors`)
}

export async function createDoctor(doctorData) {
  return apiCall(`${API_BASE.rdv}/api/rdv/doctors`, {
    method: 'POST',
    body: JSON.stringify(doctorData)
  })
}

export async function deleteDoctor(doctorId) {
  return apiCall(`${API_BASE.rdv}/api/rdv/doctors/${doctorId}`, {
    method: 'DELETE'
  })
}

// Appointments API
export async function fetchMyAppointments() {
  return apiCall(`${API_BASE.rdv}/api/rdv/my`)
}

export async function fetchAllAppointments() {
  return apiCall(`${API_BASE.rdv}/api/rdv`)
}

export async function createAppointment(appointmentData) {
  return apiCall(`${API_BASE.rdv}/api/rdv`, {
    method: 'POST',
    body: JSON.stringify(appointmentData)
  })
}

export async function cancelAppointment(id) {
  return apiCall(`${API_BASE.rdv}/api/rdv/${id}/cancel`, {
    method: 'POST'
  })
}
