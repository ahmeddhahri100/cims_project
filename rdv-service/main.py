import os
from datetime import datetime
from typing import List, Optional

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
    appointment_date: str  # Format ISO: 2025-02-20T10:00:00
    reason: str
    notes: Optional[str] = None

class AppointmentOut(BaseModel):
    id: int
    patient_id: str
    doctor_id: str
    appointment_date: datetime
    reason: str
    notes: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DoctorOut(BaseModel):
    id: str
    name: str
    speciality: str
    email: Optional[str]
    phone: Optional[str]

    class Config:
        from_attributes = True

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

@app.post("/api/rdv/doctors/seed")
async def seed_doctors(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialiser les médecins (admin uniquement)"""
    if user["role"] not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Admin uniquement")
    
    doctors_data = [
        {"id": "dr-001", "name": "Dr. Sana Mansour", "speciality": "Cardiologie"},
        {"id": "dr-002", "name": "Dr. Karim Trabelsi", "speciality": "Pédiatrie"},
        {"id": "dr-003", "name": "Dr. Leila Gharbi", "speciality": "Neurologie"},
        {"id": "dr-004", "name": "Dr. Mounir Belhaj", "speciality": "Dermatologie"},
        {"id": "dr-005", "name": "Dr. Ines Sfar", "speciality": "Gynécologie"},
    ]
    
    for doc_data in doctors_data:
        existing = db.query(Doctor).filter(Doctor.id == doc_data["id"]).first()
        if not existing:
            doctor = Doctor(**doc_data)
            db.add(doctor)
    
    db.commit()
    return {"message": "Médecins initialisés"}

# ── Appointments (alias /api/rdv pour compatibilité frontend) ───

# Créer un rendez-vous
@app.post("/api/rdv", response_model=AppointmentOut, status_code=201)
@app.post("/api/appointments", response_model=AppointmentOut, status_code=201)
async def create_appointment(
    body: AppointmentCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from datetime import datetime as dt
    
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
        patient_id=user["userId"],
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
    db: Session = Depends(get_db)
):
    patient_id = str(user.get("userId", user.get("id", "")))
    return db.query(Appointment)\
             .filter(Appointment.patient_id == patient_id)\
             .order_by(Appointment.appointment_date.desc())\
             .all()

# Tous les rendez-vous (médecin / admin)
@app.get("/api/rdv", response_model=List[AppointmentOut])
@app.get("/api/appointments", response_model=List[AppointmentOut])
async def all_appointments(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user["role"] not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Réservé aux médecins et admins")
    return db.query(Appointment).order_by(Appointment.appointment_date.desc()).all()

# Détail d'un RDV
@app.get("/api/rdv/{rdv_id}", response_model=AppointmentOut)
@app.get("/api/appointments/{rdv_id}", response_model=AppointmentOut)
async def get_appointment(
    rdv_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rdv = db.query(Appointment).filter(Appointment.id == rdv_id).first()
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")

    if user["role"] == "patient" and rdv.patient_id != user["userId"]:
        raise HTTPException(status_code=403, detail="Accès refusé")

    return rdv

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
