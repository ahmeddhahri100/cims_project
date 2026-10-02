from sqlalchemy import Column, Integer, String, DateTime, Text
from database import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, nullable=False)
    doctor_id = Column(String, nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    reason = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, server_default="NOW()")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    speciality = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, server_default="NOW()")
