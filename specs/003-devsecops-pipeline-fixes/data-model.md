# Data Model: CIMS Polyglot Architecture

This document defines the data entities and their storage mappings across the three database types.

## Entities

### User (Auth-Service)
- **Storage**: PostgreSQL (`cims_auth`)
- **Fields**:
  - `id`: UUID (Primary Key)
  - `username`: String (Unique)
  - `password`: String (Hashed)
  - `role`: Enum (ADMIN, DOCTOR, STAFF)
  - `created_at`: Timestamp

### Patient (Patient-Service)
- **Storage**: MongoDB (`cims_patients` database, `patients` collection)
- **Fields**:
  - `_id`: ObjectID
  - `firstName`: String
  - `lastName`: String
  - `email`: String (Unique)
  - `phone`: String
  - `dateOfBirth`: Date
  - `medicalHistory`: Array of Objects

### Appointment (RDV-Service)
- **Storage**: MySQL (`cims_rdv`)
- **Fields**:
  - `id`: Integer (Primary Key, Auto-increment)
  - `patient_id`: String (Reference to MongoDB Patient ID)
  - `doctor_id`: Integer (Reference to PostgreSQL Doctor Record)
  - `appointment_date`: DateTime
  - `status`: Enum (PENDING, CONFIRMED, CANCELLED)
  - `notes`: Text

### Doctor (Shared/Auth/RDV)
- **Storage**: PostgreSQL (`cims_rdv` or shared `auth`)
- **Fields**:
  - `id`: Integer (Primary Key)
  - `name`: String
  - `specialization`: String

## Storage Strategy

| Service | Database | Technology | Reason |
|---------|----------|------------|--------|
| Auth | PostgreSQL | Relational | Strict consistency for credentials and RBAC. |
| Patient | MongoDB | Document | Flexible schema for diverse medical records. |
| RDV | MySQL | Relational | Efficient joining for scheduling and reporting. |
