# API Contracts: CIMS Microservices

This directory contains the interface definitions for the CIMS microservices.

## Service Endpoints

### Auth-Service (Port 3001)
- `POST /api/auth/login`: Authenticate user and return JWT.
- `POST /api/auth/register`: Create new user.
- `GET /api/auth/verify`: Validate JWT token (Internal).

### Patient-Service (Port 3002)
- `GET /api/patients`: List all patients.
- `POST /api/patients`: Create new patient record (MongoDB).
- `GET /api/patients/:id`: Get patient details.

### RDV-Service (Port 3003)
- `GET /api/appointments`: List appointments.
- `POST /api/appointments`: Schedule new appointment (MySQL).
- `PATCH /api/appointments/:id`: Update status.

## Security Contract

All requests to `Patient` and `RDV` services MUST include:
- **Header**: `Authorization: Bearer <JWT>`
- **Validation**: Services MUST call `auth-service:3001/api/auth/verify` for every protected request.
