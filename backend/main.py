from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import os
from calculator import AnnaUniversityCGPA
from ocr_service_v3 import SevenLayerOCRService
from curriculum_service import CurriculumService
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from models import User, Report, SubjectRow

# Initialize App
app = FastAPI(
    title="Anna University CGPA Calculator API",
    description="API to extract grades from marksheets and calculate CGPA/GPA using production-grade 7-layer OCR pipeline.",
    version="3.0.0"
)

# Ensure tables exist for local/dev runs (safe no-op when already migrated)
Base.metadata.create_all(bind=engine)

# CORS (Allow Frontend)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
# Production 7-Layer OCR v3 with multi-pass and anchor-based grouping
curriculum_service = CurriculumService()
ocr_service = SevenLayerOCRService(curriculum_service=curriculum_service, debug=False)
cgpa_calculator = AnnaUniversityCGPA(curriculum_service=curriculum_service)

@app.get("/")
def read_root():
    return {
        "status": "✅ Anna University CGPA Calculator API is running",
        "version": "3.0.0",
        "ocr_engine": "7-Layer Production Pipeline v3",
        "endpoints": {
            "health": "GET /",
            "calculate_single": "POST /calculate-cgpa/",
        }
    }

from pydantic import BaseModel
from typing import List, Optional


class FirebaseLoginRequest(BaseModel):
    firebase_uid: str
    email: str
    name: Optional[str] = None


class SaveSubjectRequest(BaseModel):
    subject_code: str
    grade: str
    credits: float
    original_semester: Optional[int] = None
    is_arrear: Optional[bool] = False


class SaveReportRequest(BaseModel):
    firebase_uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    semester: int
    regulation: str = "2021"
    branch: str = "CSE"
    gpa: float
    cgpa: float
    total_credits: float = 0
    subjects: List[SaveSubjectRequest]

class ManualSubject(BaseModel):
    subject_code: str
    grade: str
    semester: Optional[int] = 1
    credits: Optional[float] = None

class CalculateRequest(BaseModel):
    subjects: List[ManualSubject]
    semester: int = 1
    regulation: str = "2021"
    branch: str = "CSE"


@app.post("/auth/firebase-login")
def firebase_login(request: FirebaseLoginRequest, db: Session = Depends(get_db)):
    """
    Upsert user profile using Firebase UID from frontend auth flow.
    Handles merging when same email logs in with different UID (rare case).
    """
    try:
        uid = request.firebase_uid.strip()
        if not uid:
            raise HTTPException(status_code=400, detail="firebase_uid is required")

        # First, try to find by firebase_uid
        user = db.query(User).filter(User.firebase_uid == uid).first()
        
        if not user and request.email:
            # If not found by UID, try to find by email (handles email-based login reconciliation)
            user = db.query(User).filter(User.email == request.email.strip()).first()
            if user:
                # Update existing user's firebase_uid if it was missing or different
                user.firebase_uid = uid
        
        if user:
            # Update existing user record
            if request.email:
                user.email = request.email.strip()
            if request.name:
                user.name = request.name
        else:
            # Create new user
            user = User(firebase_uid=uid, email=request.email.strip() if request.email else None, name=request.name)
            db.add(user)

        db.commit()
        db.refresh(user)
        return {
            "status": "success",
            "user": {
                "id": user.id,
                "firebase_uid": user.firebase_uid,
                "email": user.email,
                "name": user.name,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save user: {e}")


@app.post("/reports/save")
def save_report(request: SaveReportRequest, db: Session = Depends(get_db)):
    """
    Persist calculated report + subject rows for an authenticated Firebase user.
    Upserts user by firebase_uid or email to handle login reconciliation.
    """
    try:
        uid = request.firebase_uid.strip()
        if not uid:
            raise HTTPException(status_code=400, detail="firebase_uid is required")

        # First, try to find by firebase_uid
        user = db.query(User).filter(User.firebase_uid == uid).first()
        
        if not user and request.email:
            # If not found by UID, try to find by email
            user = db.query(User).filter(User.email == request.email.strip()).first()
            if user:
                # Update existing user's firebase_uid if missing or different
                user.firebase_uid = uid
        
        if not user:
            # Create new user
            user = User(firebase_uid=uid, email=request.email.strip() if request.email else None, name=request.name)
            db.add(user)
            db.flush()
        else:
            # Update existing user info
            if request.email:
                user.email = request.email.strip()
            if request.name:
                user.name = request.name

        inferred_semester = max(
            [
                int(s.original_semester)
                for s in request.subjects
                if s.original_semester is not None and int(s.original_semester) > 0
            ]
            or [int(request.semester)]
        )

        report = Report(
            user_id=user.id,
            semester=inferred_semester,
            gpa=request.gpa,
            cgpa=request.cgpa,
            regulation=request.regulation,
            branch=request.branch,
            total_credits=request.total_credits,
        )
        db.add(report)
        db.flush()

        for subj in request.subjects:
            grade_u = (subj.grade or "").upper()
            subject_row = SubjectRow(
                report_id=report.id,
                subject_code=subj.subject_code,
                title=None,
                credits=subj.credits,
                grade=grade_u,
                original_semester=subj.original_semester,
                is_arrear=bool(subj.is_arrear),
                is_pass=grade_u not in {"U", "RA", "SA", "W", "AB", "F", "-"},
            )
            db.add(subject_row)

        db.commit()
        return {
            "status": "success",
            "report_id": report.id,
            "subject_count": len(request.subjects),
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save report: {e}")


@app.get("/reports/user/{firebase_uid}")
def get_user_reports(firebase_uid: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        return {"status": "success", "reports": [], "semesters_present": [], "semester_gpas": []}

    reports = (
        db.query(Report)
        .filter(Report.user_id == user.id)
        .order_by(Report.created_at.desc(), Report.id.desc())
        .all()
    )

    # Compatibility layer: derive semester presence + GPA from subject rows.
    # This recovers multi-sem uploads that were previously saved under a single report semester.
    latest_by_sem_code = {}
    for report in reports:
        for subj in report.subjects:
            sem = int(subj.original_semester or 0)
            code = (subj.subject_code or "").upper().strip()
            if sem <= 0 or not code:
                continue
            key = (sem, code)
            if key not in latest_by_sem_code:
                latest_by_sem_code[key] = subj

    semester_buckets = {}
    for (sem, _), subj in latest_by_sem_code.items():
        if sem not in semester_buckets:
            semester_buckets[sem] = {"weighted": 0.0, "credits": 0.0}

        grade_u = str(subj.grade or "").upper()
        credits = float(subj.credits or 0)
        gp_map = {
            "S": 10,
            "O": 10,
            "A+": 9,
            "A": 8,
            "B+": 7,
            "B": 6,
            "C": 5,
        }
        if grade_u in gp_map and credits > 0:
            semester_buckets[sem]["weighted"] += gp_map[grade_u] * credits
            semester_buckets[sem]["credits"] += credits

    semester_gpas = [
        {
            "semester": sem,
            "gpa": round((vals["weighted"] / vals["credits"]), 2) if vals["credits"] > 0 else 0.0,
        }
        for sem, vals in sorted(semester_buckets.items(), key=lambda x: x[0])
    ]
    semesters_present = [item["semester"] for item in semester_gpas]

    return {
        "status": "success",
        "reports": [
            {
                "id": r.id,
                "semester": r.semester,
                "gpa": r.gpa,
                "cgpa": r.cgpa,
                "branch": r.branch,
                "regulation": r.regulation,
                "total_credits": r.total_credits,
                "created_at": r.created_at,
            }
            for r in reports
        ],
        "semesters_present": semesters_present,
        "semester_gpas": semester_gpas,
    }


@app.get("/reports/user/{firebase_uid}/semester/{semester}")
def get_user_semester_report(firebase_uid: str, semester: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        return {"status": "success", "report": None}

    report = (
        db.query(Report)
        .filter(Report.user_id == user.id, Report.semester == semester)
        .order_by(Report.created_at.desc(), Report.id.desc())
        .first()
    )

    if not report:
        return {"status": "success", "report": None}

    subjects = sorted(
        report.subjects,
        key=lambda s: ((s.subject_code or "").upper(), s.id),
    )
    arrears_count = sum(1 for s in subjects if not bool(s.is_pass))

    return {
        "status": "success",
        "report": {
            "id": report.id,
            "semester": report.semester,
            "gpa": report.gpa,
            "cgpa": report.cgpa,
            "branch": report.branch,
            "regulation": report.regulation,
            "total_credits": report.total_credits,
            "created_at": report.created_at,
            "subject_count": len(subjects),
            "arrears_count": arrears_count,
            "subjects": [
                {
                    "id": s.id,
                    "subject_code": s.subject_code,
                    "credits": s.credits,
                    "grade": s.grade,
                    "original_semester": s.original_semester,
                    "is_arrear": s.is_arrear,
                    "is_pass": s.is_pass,
                }
                for s in subjects
            ],
        },
    }


@app.get("/reports/user/{firebase_uid}/subjects")
def get_user_subjects(firebase_uid: str, db: Session = Depends(get_db)):
    """
    Returns a normalized latest snapshot of subjects per semester for a user.
    This is used to re-run intelligence across old + new semesters and for edit-all UI.
    """
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        return {"status": "success", "subjects": [], "by_semester": {}, "semester_gpas": []}

    reports = (
        db.query(Report)
        .filter(Report.user_id == user.id)
        .order_by(Report.created_at.desc(), Report.id.desc())
        .all()
    )

    latest_by_sem_code = {}
    for report in reports:
        for subj in report.subjects:
            sem = int(subj.original_semester or report.semester or 0)
            code = (subj.subject_code or "").upper().strip()
            if sem <= 0 or not code:
                continue
            key = (sem, code)
            if key not in latest_by_sem_code:
                latest_by_sem_code[key] = {
                    "subject_code": code,
                    "grade": str(subj.grade or "").upper(),
                    "credits": float(subj.credits or 0),
                    "original_semester": sem,
                    "is_arrear": bool(subj.is_arrear),
                    "is_pass": bool(subj.is_pass),
                }

    by_semester = {}
    semester_buckets = {}
    gp_map = {
        "S": 10,
        "O": 10,
        "A+": 9,
        "A": 8,
        "B+": 7,
        "B": 6,
        "C": 5,
    }

    for (sem, _), subj in sorted(latest_by_sem_code.items(), key=lambda item: (item[0][0], item[0][1])):
        if sem not in by_semester:
            by_semester[sem] = []
        by_semester[sem].append(subj)

        if sem not in semester_buckets:
            semester_buckets[sem] = {"weighted": 0.0, "credits": 0.0}
        grade_u = str(subj["grade"]).upper()
        credits = float(subj["credits"])
        if grade_u in gp_map and credits > 0:
            semester_buckets[sem]["weighted"] += gp_map[grade_u] * credits
            semester_buckets[sem]["credits"] += credits

    semester_gpas = [
        {
            "semester": sem,
            "gpa": round((vals["weighted"] / vals["credits"]), 2) if vals["credits"] > 0 else 0.0,
        }
        for sem, vals in sorted(semester_buckets.items(), key=lambda x: x[0])
    ]

    return {
        "status": "success",
        "subjects": list(latest_by_sem_code.values()),
        "by_semester": {str(k): v for k, v in sorted(by_semester.items(), key=lambda x: x[0])},
        "semester_gpas": semester_gpas,
    }

@app.post("/preview-ocr/")
async def preview_ocr(file: UploadFile = File(...)):
    """
    OCR Preview Endpoint — used by the frontend scan flow.
    Returns raw extracted subjects before calculation, so the user can review/edit them.
    Response format: { subjects, semester_info, confidence, status }
    """
    try:
        print(f"[preview-ocr] Received: {file.filename}, type: {file.content_type}")

        if not (file.content_type.startswith('image/') or file.content_type == 'application/pdf'):
            raise HTTPException(status_code=400, detail="File must be an image or PDF")

        contents = await file.read()
        print(f"[preview-ocr] File size: {len(contents)} bytes")

        # Run OCR pipeline
        result, error = ocr_service.process_marksheet(contents)
        if error:
            raise HTTPException(status_code=500, detail=f"OCR Error: {error}")
        if not result:
            raise HTTPException(status_code=500, detail="OCR processing failed — no result returned")

        # Build subject list in the format the frontend expects
        raw_subjects = result.get('subjects', [])
        semester_info = result.get('semester_info', {})
        regulation = str(semester_info.get('regulation') or '2021')
        subjects_out = []
        for s in raw_subjects:
            subject_code = s.get('subject_code', '')
            credit_res = curriculum_service.get_credits(subject_code, 'CSE', regulation)
            subjects_out.append({
                "subject_code": subject_code,
                "grade": s.get('grade', ''),
                "marks": s.get('marks'),
                # Always prefer curriculum credits to avoid OCR/default drift in preview.
                "credits": credit_res.credits,
                "confidence": s.get('confidence', 1.0),
                "semester": semester_info.get('semester'),
                "original_semester": s.get('original_semester'),
                "is_revaluation": s.get('is_revaluation', False),
                "overridden_by_revaluation": s.get('overridden_by_revaluation', False),
                "main_grade": s.get('main_grade'),
                "revaluation_grade": s.get('revaluation_grade'),
                "review_required": s.get('review_required', False),
            })

        return {
            "subjects": subjects_out,
            "semester_info": result.get('semester_info', {}),
            "confidence": result.get('confidence', {}),
            "status": "preview_ready",
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        print(f"[preview-ocr] Unexpected error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calculate-from-data/")
async def calculate_from_data(request: CalculateRequest):
    """
    Direct Calculation from provided JSON data (used for Manual Entry)
    """
    try:
        print(f"Manual calculation requested for branch: {request.branch}, sem: {request.semester}, reg: {request.regulation}")

        # Multi-sem payloads (OCR flow) can contain subjects from multiple semesters.
        # In that case, do not classify every earlier-sem subject as arrear by default.
        subject_sem_values = {
            int(s.semester) for s in request.subjects
            if getattr(s, 'semester', None) is not None and int(s.semester) > 0
        }
        is_multi_sem_payload = len(subject_sem_values) > 1
        
        # 1. Enrich subjects with credits from curriculum service using the provided branch
        enriched_grades = []
        for s in request.subjects:
            # Normalize branch name to uppercase/code used in data files
            branch_key = request.branch.upper()
            
            # get_credits returns a CreditResult object
            credit_res = curriculum_service.get_credits(s.subject_code, branch_key, request.regulation)
            credits = s.credits if s.credits is not None else credit_res.credits
            subject_semester = credit_res.semester
            
            is_arrear = False
            row_semester = s.semester if s.semester and s.semester > 0 else None

            if is_multi_sem_payload:
                # For cumulative multi-sem calculations, treat rows as normal semester records
                # unless there is an explicit semester mismatch for that subject.
                if subject_semester is not None and row_semester is not None and subject_semester != row_semester:
                    is_arrear = True
            else:
                # For single-sem/manual mode, preserve conservative arrear detection.
                if subject_semester is not None and subject_semester > 0:
                    if subject_semester < request.semester - 1:
                        is_arrear = True
                
            enriched_grade = {
                'subject': s.subject_code,
                'grade': s.grade,
                'credits': credits,
                'original_semester': subject_semester if subject_semester else (s.semester or request.semester),
                'is_arrear': is_arrear
            }
            enriched_grades.append(enriched_grade)
            
        # 2. Calculate GPA/CGPA
        calc_result = cgpa_calculator.calculate_cgpa_from_grades(enriched_grades, request.semester)
        
        gpa = calc_result.get('gpa', 0.0)
        cgpa = calc_result.get('cgpa', 0.0)
        details = calc_result.get('subjects', {})

        # For single-sem calculations, show class from semester GPA (not cumulative CGPA with arrears)
        if not is_multi_sem_payload:
            cgpa = gpa
            class_div = cgpa_calculator.get_class_division(gpa, has_arrears=False)
        else:
            class_div = calc_result.get('class', cgpa_calculator.get_class_division(cgpa))

        percentage = cgpa_calculator.calculate_percentage(cgpa)
        
        return {
            "gpa": gpa,
            "cgpa": cgpa,
            "percentage": f"{percentage}%",
            "class": class_div,
            "total_subjects": len(details),
            "subjects": details,
            "semester_gpas": calc_result.get('semester_gpas', []),
            "semester_credits": calc_result.get('semester_credits', 0),
            "total_credits": calc_result.get('total_credits', 0),
            "arrear_subjects": calc_result.get('arrear_subjects', 0),
            "passed_subjects": calc_result.get('passed_subjects', 0),
            "failed_subjects": calc_result.get('failed_subjects', 0),
            "status": "success",
            "semester_info": {
                "semester": request.semester,
                "regulation": request.regulation,
                "branch": request.branch
            }
        }
        
    except Exception as e:
        import traceback
        print(f"Manual Calculation Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calculate-cgpa/")
async def calculate_cgpa(file: UploadFile = File(...)):
    """
    Upload marksheet image → Extract Grades → Calculate Results
    
    Enhanced v3 Features:
    - 7-layer OCR pipeline (90%+ accuracy)
    - Row grouping and fragment merging
    - Semester detection (R2013/2017/2021/2025)
    - Comprehensive validation
    - Layer-wise confidence scoring
    """
    try:
        print(f"Received file: {file.filename}, content_type: {file.content_type}")
        
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
            
        contents = await file.read()
        print(f"File size: {len(contents)} bytes")
        
        # 1. OCR Extraction (v3 with 7-layer pipeline)
        result, error = ocr_service.process_marksheet(contents)
        
        if error:
            print(f"OCR Error: {error}")
            raise HTTPException(status_code=500, detail=f"OCR Error: {error}")
        
        if not result:
            raise HTTPException(status_code=500, detail="OCR processing failed")
            
        # 2. Parse Grades from OCR Result (v3 format) with curriculum credits
        extracted_grades = ocr_service.extract_grades_from_result(result)
        print(f"Extracted grades: {extracted_grades}")
        
        if not extracted_grades:
             raise HTTPException(status_code=422, detail="No valid grades detected in the image.")
        
        # Get current semester from v3 semester_info
        semester = 1
        semester_info = result.get('semester_info', {})
        if semester_info and semester_info.get('semester'):
            semester = semester_info['semester']
        
        # 3. Enrich grades with curriculum credits and detect arrears
        enriched_grades = []
        for grade in extracted_grades:
            subject_code = grade.get('subject', '')
            
            # Get credits from curriculum (official Anna University values)
            credits = curriculum_service.get_credits(subject_code, 'CSE')
            subject_semester = curriculum_service.get_semester(subject_code, 'CSE')
            
            # Determine if this is an arrear subject
            # - A subject is an arrear only if its original semester is SIGNIFICANTLY LESS than current marksheet semester
            # - OR if the grade is explicitly a fail grade (RA, U, AB, F)
            # - Use a conservative approach to avoid marking normal subjects as arrears
            is_arrear = False
            is_fail_grade = grade.get('grade', '').upper() in ['RA', 'U', 'AB', 'F', 'W', 'SA']
            
            # Use detected semester if valid (not just default 1 if detection failed)
            current_sem = semester if semester_info.get('semester') else None
            
            if current_sem and subject_semester is not None:
                # Only mark as arrear if it's from a significantly lower semester (2+ difference) OR is a fail grade
                is_arrear = (subject_semester < current_sem - 1) or is_fail_grade
            elif current_sem and grade.get('original_semester'):
                # Same logic for OCR-detected original semester
                orig_sem = grade['original_semester']
                is_arrear = (orig_sem < current_sem - 1) or is_fail_grade
            else:
                # Fallback: only fail grades are arrears if semester context is missing
                is_arrear = is_fail_grade
            
            enriched_grade = {
                'subject': subject_code,
                'grade': grade.get('grade', ''),
                'credits': credits,
                'marks': grade.get('marks'),
                'original_semester': subject_semester if subject_semester else (grade.get('original_semester') or semester),
                'is_arrear': is_arrear
            }
            enriched_grades.append(enriched_grade)
        
        # 4. Calculate GPA/CGPA using enhanced calculator
        calculator = AnnaUniversityCGPA(curriculum_service=curriculum_service)
        calc_result = calculator.calculate_cgpa_from_grades(enriched_grades, semester)
        
        gpa = calc_result.get('gpa', 0.0)
        cgpa = calc_result.get('cgpa', 0.0)
        details = calc_result.get('subjects', {})
        
        print(f"Calculated GPA: {gpa}")
        print(f"Details: {details}")
        
        percentage = calculator.calculate_percentage(cgpa)
        class_div = calc_result.get('class', calculator.get_class_division(cgpa))
        
        # 4. Build Enhanced Response (v3 with layer confidence and processing info)
        response = {
            # Core metrics (backward compatible)
            "gpa": gpa,
            "cgpa": cgpa,
            "percentage": f"{percentage}%",
            "class": class_div,
            "total_subjects": len(details),
            "subjects": details,
            "semester_gpas": calc_result.get('semester_gpas', []),
            "semester_credits": calc_result.get('semester_credits', 0),
            "total_credits": calc_result.get('total_credits', 0),
            "arrear_subjects": calc_result.get('arrear_subjects', 0),
            "passed_subjects": calc_result.get('passed_subjects', 0),
            "failed_subjects": calc_result.get('failed_subjects', 0),
            "status": "success",
            
            # v3 fields
            "confidence": result.get('confidence', {}),
            "semester_info": result.get('semester_info', {}),
            "processing_info": result.get('processing_info', {}),
        }
        
        # Add marks to subject details if available
        if result.get('subjects'):
            for subject_data in result['subjects']:
                subject_code = subject_data['subject_code']
                if subject_code in details and subject_data.get('marks') is not None:
                    details[subject_code]['marks'] = subject_data['marks']
        
        return response

    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        print(f"Unexpected error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
