import os
from datetime import datetime
from typing import List, Optional

from dotenv import load_dotenv
load_dotenv()

import httpx
from fastapi import FastAPI, Depends, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, engine, Base
from models import Appointment, Doctor

# Créer les tables au démarrage
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RDV Service", version="1.0.0", description="CIMS — Gestion des rendez-vous")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:3001")

# ── Schémas Pydantic ────────────────────────────────────────────
class AppointmentCreate(BaseModel):
    doctor_id: str
    patient_id: Optional[str] = None  # For doctors to specify patient
    appointment_date: str  # Format ISO: 2025-02-20T10:00:00
    reason: str
    notes: Optional[str] = None

class AppointmentOut(BaseModel):
    id: int
    patient_id: str
    doctor_id: str
    patient_name: Optional[str] = None
    appointment_date: datetime
    reason: str
    notes: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DoctorCreate(BaseModel):
    name: str
    speciality: str
    email: Optional[str] = None
    phone: Optional[str] = None

class DoctorOut(BaseModel):
    id: str
    name: str
    speciality: str
    email: Optional[str]
    phone: Optional[str]

    class Config:
        from_attributes = True

# ── Service URLs ────────────────────────────────────────────────
PATIENT_SERVICE_URL = os.getenv("PATIENT_SERVICE_URL", "http://patient-service:3002")

# ── Auth middleware ─────────────────────────────────────────────
async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            r = await client.post(
                f"{AUTH_SERVICE_URL}/api/auth/verify",
                headers={"Authorization": f"Bearer {token}"}
            )
            data = r.json()
            if not data.get("valid"):
                raise HTTPException(status_code=403, detail="Token invalide")
            return data["user"]
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Service auth indisponible")

# ── Patient Service Integration ─────────────────────────────────
async def get_patient_details(patient_id: str, token: str):
    """Fetch patient details from patient-service"""
    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            r = await client.get(
                f"{PATIENT_SERVICE_URL}/api/patients/{patient_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if r.status_code == 200:
                return r.json()
            return None
        except httpx.RequestError:
            return None

# ── Helpers ─────────────────────────────────────────────────────
async def enrich_with_patient_names(appointments: list, token: str) -> list:
    """Inject patient_name into each appointment from patient-service"""
    patient_ids = {apt.patient_id for apt in appointments if apt.patient_id}
    name_map = {}
    for pid in patient_ids:
        details = await get_patient_details(pid, token)
        if details:
            first = details.get("first_name", "")
            last = details.get("last_name", "")
            name_map[pid] = f"{first} {last}".strip() or pid
    result = []
    for apt in appointments:
        out = AppointmentOut.model_validate(apt)
        out.patient_name = name_map.get(apt.patient_id, apt.patient_id)
        result.append(out)
    return result

# ── Routes ──────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "healthy", "service": "rdv-service", "timestamp": datetime.now().isoformat()}

# ── Doctors ─────────────────────────────────────────────────────
@app.get("/api/rdv/doctors", response_model=List[DoctorOut])
async def get_doctors(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer la liste des médecins"""
    return db.query(Doctor).all()

# ── Patients (Proxy to patient-service) ─────────────────────────
@app.get("/api/rdv/patients")
async def search_patients(
    user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """Rechercher des patients (médecin/admin uniquement) - proxy vers patient-service"""
    if user["role"] not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Réservé aux médecins et admins")

    token = credentials.credentials
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            r = await client.get(
                f"{PATIENT_SERVICE_URL}/api/patients",
                headers={"Authorization": f"Bearer {token}"}
            )
            if r.status_code == 200:
                data = r.json()
                patients = data.get("patients", [])
                # Enrichir les emails depuis auth-service
                for p in patients:
                    pid = p.get("id")
                    if pid:
                        try:
                            ur = await client.get(
                                f"{AUTH_SERVICE_URL}/api/auth/users/{pid}",
                                headers={"Authorization": f"Bearer {token}"}
                            )
                            if ur.status_code == 200:
                                auth_user = ur.json()
                                p["email"] = auth_user.get("email", p.get("email"))
                        except:
                            pass
                return {"count": len(patients), "patients": patients}
            return {"count": 0, "patients": []}
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Service patient indisponible")

@app.get("/api/rdv/patients/{patient_id}")
async def get_patient(
    patient_id: str,
    user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    """Récupérer les détails d'un patient (médecin/admin uniquement)"""
    if user["role"] not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Réservé aux médecins et admins")

    token = credentials.credentials
    patient = await get_patient_details(patient_id, token)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient introuvable")
    return patient

@app.post("/api/rdv/doctors", response_model=DoctorOut, status_code=201)
async def create_doctor(
    body: DoctorCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ajouter un nouveau médecin (idempotent par email)"""
    if user["role"] not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Réservé aux médecins et admins")

    if body.email:
        existing = db.query(Doctor).filter(Doctor.email == body.email).first()
        if existing:
            return existing

    count = db.query(Doctor).count()
    doctor_id = f"dr-{str(count + 1).zfill(3)}"

    doctor = Doctor(
        id=doctor_id,
        name=body.name,
        speciality=body.speciality,
        email=body.email,
        phone=body.phone,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor

@app.delete("/api/rdv/doctors/{doctor_id}")
async def delete_doctor(
    doctor_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Supprimer un médecin"""
    if user["role"] not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Réservé aux médecins et admins")

    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Médecin introuvable")

    db.delete(doctor)
    db.commit()
    return {"message": "Médecin supprimé"}

# ── Appointments (alias /api/rdv pour compatibilité frontend) ───

# Créer un rendez-vous
@app.post("/api/rdv", response_model=AppointmentOut, status_code=201)
@app.post("/api/appointments", response_model=AppointmentOut, status_code=201)
async def create_appointment(
    body: AppointmentCreate,
    user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    from datetime import datetime as dt

    # Déterminer le patient_id
    # Les médecins peuvent créer des RDV pour d'autres patients
    # Les patients ne peuvent créer que leurs propres RDV
    if body.patient_id:
        # Un patient_id est spécifié
        if user["role"] == "patient" and body.patient_id != str(user["userId"]):
            raise HTTPException(status_code=403, detail="Vous ne pouvez créer des RDV que pour vous-même")
        patient_id = body.patient_id
    else:
        # Pas de patient_id spécifié, utiliser l'utilisateur actuel
        patient_id = str(user["userId"])

    # Parser la date
    try:
        appt_date = dt.fromisoformat(body.appointment_date.replace('Z', '+00:00'))
    except:
        appt_date = dt.strptime(body.appointment_date, "%Y-%m-%dT%H:%M:%S")

    # Vérifier qu'aucun RDV n'existe déjà pour ce médecin à cette heure
    conflict = db.query(Appointment).filter(
        Appointment.doctor_id == body.doctor_id,
        Appointment.appointment_date == appt_date,
        Appointment.status.in_(["pending", "confirmed"])
    ).first()

    if conflict:
        raise HTTPException(status_code=409, detail="Ce créneau est déjà réservé")

    rdv = Appointment(
        patient_id=patient_id,
        doctor_id=body.doctor_id,
        appointment_date=appt_date,
        reason=body.reason,
        notes=body.notes,
        status="pending"
    )
    db.add(rdv)
    db.commit()
    db.refresh(rdv)
    return rdv

# Mes rendez-vous (patient)
@app.get("/api/rdv/my", response_model=List[AppointmentOut])
@app.get("/api/appointments/my", response_model=List[AppointmentOut])
async def my_appointments(
    user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    patient_id = str(user.get("userId", user.get("id", "")))
    apts = db.query(Appointment)\
             .filter(Appointment.patient_id == patient_id)\
             .order_by(Appointment.appointment_date.desc())\
             .all()
    token = credentials.credentials
    return await enrich_with_patient_names(apts, token)

# Tous les rendez-vous (médecin / admin)
@app.get("/api/rdv", response_model=List[AppointmentOut])
@app.get("/api/appointments", response_model=List[AppointmentOut])
async def all_appointments(
    user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db),
    doctor_id: Optional[str] = None,
):
    if user["role"] not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Réservé aux médecins et admins")

    query = db.query(Appointment)

    if user["role"] == "doctor":
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        else:
            doc = db.query(Doctor).filter(Doctor.email == user.get("email", "")).first()
            if doc:
                query = query.filter(Appointment.doctor_id == doc.id)

    apts = query.order_by(Appointment.appointment_date.desc()).all()
    token = credentials.credentials
    return await enrich_with_patient_names(apts, token)

# Détail d'un RDV
@app.get("/api/rdv/{rdv_id}", response_model=AppointmentOut)
@app.get("/api/appointments/{rdv_id}", response_model=AppointmentOut)
async def get_appointment(
    rdv_id: int,
    user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    rdv = db.query(Appointment).filter(Appointment.id == rdv_id).first()
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")

    if user["role"] == "patient" and rdv.patient_id != user["userId"]:
        raise HTTPException(status_code=403, detail="Accès refusé")

    token = credentials.credentials
    enriched = await enrich_with_patient_names([rdv], token)
    return enriched[0] if enriched else rdv

# Annuler un RDV
@app.post("/api/rdv/{rdv_id}/cancel")
@app.patch("/api/appointments/{rdv_id}/status")
async def cancel_appointment(
    rdv_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rdv = db.query(Appointment).filter(Appointment.id == rdv_id).first()
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")

    # Patient peut seulement annuler le sien
    if user["role"] == "patient" and rdv.patient_id != user["userId"]:
        raise HTTPException(status_code=403, detail="Accès refusé")

    rdv.status = "cancelled"
    db.commit()
    db.refresh(rdv)
    return rdv

# Changer le statut (admin/médecin)
@app.patch("/api/rdv/{rdv_id}/status")
async def update_status(
    rdv_id: int,
    status: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    allowed = ["pending", "confirmed", "cancelled", "completed"]
    if status not in allowed:
        raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs: {allowed}")

    if user["role"] not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Réservé aux médecins et admins")

    rdv = db.query(Appointment).filter(Appointment.id == rdv_id).first()
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")

    rdv.status = status
    db.commit()
    db.refresh(rdv)
    return rdv
