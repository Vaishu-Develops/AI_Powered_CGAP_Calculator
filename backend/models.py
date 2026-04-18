from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    
    # Subscription & Engagement (Phase 5)
    is_pro = Column(Boolean, default=False)
    streak_count = Column(Integer, default=1)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now())
    badges = Column(JSONB, default=[]) # Array of unlocked badge IDs
    scan_count = Column(Integer, default=0)
    
    # Referral System
    referral_code = Column(String, unique=True, index=True, nullable=True)
    referrals_count = Column(Integer, default=0)
    applied_referral_code = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    semester = Column(Integer, nullable=False)
    gpa = Column(Float, nullable=False)
    cgpa = Column(Float, nullable=False)
    regulation = Column(String, default="2021")
    branch = Column(String, default="CSE")
    total_credits = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="reports")
    subjects = relationship("SubjectRow", back_populates="report", cascade="all, delete-orphan")

class SubjectRow(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"))
    subject_code = Column(String, index=True, nullable=False)
    title = Column(String) # Optional
    credits = Column(Float, nullable=False)
    grade = Column(String, nullable=False)
    original_semester = Column(Integer)
    is_arrear = Column(Boolean, default=False)
    is_pass = Column(Boolean, default=True)

    report = relationship("Report", back_populates="subjects")

class CurriculumSubject(Base):
    __tablename__ = "curriculum"

    id = Column(Integer, primary_key=True, index=True)
    regulation = Column(String, index=True, nullable=False)
    branch = Column(String, index=True, nullable=False)
    subject_code = Column(String, index=True, nullable=False)
    title = Column(String)
    credits = Column(Float, nullable=False)
    semester = Column(Integer, nullable=False)
    is_elective = Column(Boolean, default=False)
    elective_vertical = Column(String) # For vertical-based electives like 'V2'

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reaction = Column(Integer, nullable=False) # 1-5
    comment = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

