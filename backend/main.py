import warnings
warnings.filterwarnings("ignore", category=UserWarning, module='requests')

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import os
from calculator import AnnaUniversityCGPA
from ocr_service_v3 import SaffronOCRService
from storage_service import storage_service
from cache_service import cache_service
from curriculum_service import CurriculumService
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from models import User, Report, SubjectRow, Feedback

# Initialize App
app = FastAPI(
    title="Anna University CGPA Calculator API",
    description="API to extract grades from marksheets and calculate CGPA/GPA using the high-accuracy Saffron OCR engine.",
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
# Create tables on startup if they don't exist
Base.metadata.create_all(bind=engine)

from database import SessionLocal

print("Bootstrapping CurriculumService from Neon PostgreSQL Database...")
db = SessionLocal()
try:
    curriculum_service = CurriculumService(db_session=db)
finally:
    db.close()

ocr_service = SaffronOCRService(curriculum_service=curriculum_service, debug=False)
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
    Upsert user profile and handle streak logic.
    Returns full persistent state including is_pro, badges, and streaks.
    """
    try:
        uid = request.firebase_uid.strip()
        if not uid:
            raise HTTPException(status_code=400, detail="firebase_uid is required")

        user = db.query(User).filter(User.firebase_uid == uid).first()
        from datetime import datetime, timezone, timedelta

        now = datetime.now(timezone.utc)
        
        if user:
            # Update email/name if provided
            if request.email:
                user.email = request.email.strip()
            if request.name and not user.name:
                user.name = request.name
                
            # --- STREAK LOGIC ---
            last_active = user.last_active_at
            if last_active:
                # Ensure last_active is aware
                if last_active.tzinfo is None:
                    last_active = last_active.replace(tzinfo=timezone.utc)
                
                # Ensure counters are not None (for safety with old records)
                if user.streak_count is None: user.streak_count = 1
                if user.scan_count is None: user.scan_count = 0
                if user.badges is None: user.badges = []

                diff = now.date() - last_active.date()
                if diff.days == 1:
                    user.streak_count = (user.streak_count or 0) + 1
                elif diff.days > 1:
                    user.streak_count = 1
                # if diff.days == 0, already active today, do nothing
            
            user.last_active_at = now
        else:
            # Create new user
            user = User(
                firebase_uid=uid, 
                email=request.email.strip() if request.email else None, 
                name=request.name,
                streak_count=1,
                last_active_at=now,
                is_pro=False,
                badges=[]
            )
            db.add(user)

        db.commit()
        db.refresh(user)
        
        # Final safety check before return
        badges_list = user.badges or []
        
        return {
            "status": "success",
            "user": {
                "id": user.id,
                "firebase_uid": user.firebase_uid,
                "email": user.email,
                "name": user.name,
                "is_pro": bool(user.is_pro),
                "streak_count": user.streak_count or 1,
                "last_active_at": user.last_active_at,
                "badges": badges_list,
                "scan_count": user.scan_count or 0,
                "referral_code": user.referral_code,
                "referrals_count": user.referrals_count or 0,
            },
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save user: {e}")

@app.get("/users/stats/{firebase_uid}")
def get_user_stats(firebase_uid: str, db: Session = Depends(get_db)):
    """Fetch persistent dashboard metrics (badges, streaks, pro status)."""
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "status": "success",
        "stats": {
            "is_pro": user.is_pro,
            "streak_count": user.streak_count,
            "badges": user.badges or [],
            "scan_count": user.scan_count,
            "referrals_count": user.referrals_count,
            "referral_code": user.referral_code
        }
    }

class SyncDataRequest(BaseModel):
    firebase_uid: str
    reports: List[SaveReportRequest]
    badges: List[str]

@app.post("/users/sync-local")
def sync_local_data(request: SyncDataRequest, db: Session = Depends(get_db)):
    """Bulk sync local reports and badges to the database."""
    try:
        user = db.query(User).filter(User.firebase_uid == request.firebase_uid).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Sync Badges (Union of local and remote)
        existing_badges = set(user.badges or [])
        new_badges = set(request.badges)
        user.badges = list(existing_badges | new_badges)

        # Sync Reports
        synced_count = 0
        for report_req in request.reports:
            # Check for existing
            exists = db.query(Report).filter(
                Report.user_id == user.id,
                Report.semester == report_req.semester,
                Report.gpa == report_req.gpa,
                Report.branch == report_req.branch
            ).first()
            
            if not exists:
                new_report = Report(
                    user_id=user.id,
                    semester=report_req.semester,
                    gpa=report_req.gpa,
                    cgpa=report_req.cgpa,
                    regulation=report_req.regulation,
                    branch=report_req.branch,
                    total_credits=report_req.total_credits
                )
                db.add(new_report)
                db.flush()
                
                for s in report_req.subjects:
                    db.add(SubjectRow(
                        report_id=new_report.id,
                        subject_code=s.subject_code,
                        credits=s.credits,
                        grade=s.grade,
                        original_semester=s.original_semester,
                        is_arrear=s.is_arrear,
                        is_pass=(s.grade.upper() not in {"U", "RA", "SA", "W", "AB", "F", "-"})
                    ))
                synced_count += 1

        db.commit()
        return {
            "status": "success", 
            "synced_reports": synced_count,
            "total_badges": len(user.badges or [])
        }
    except Exception as e:
        db.rollback()
        print(f"Sync local data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reports/save")
def save_report(request: SaveReportRequest, db: Session = Depends(get_db)):
    """
    Persist calculated report + subject rows for an authenticated Firebase user.
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
                user.firebase_uid = uid
        
        if not user:
            user = User(firebase_uid=uid, email=request.email.strip() if request.email else None, name=request.name)
            db.add(user)
            db.flush()
        else:
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

        # --- IDEMPOTENCY CHECK ---
        # Don't save if an identical report for this user/semester/gpa already exists
        # to avoid data duplication from frontend sync loops or multiple clicks.
        existing_duplicate = db.query(Report).filter(
            Report.user_id == user.id,
            Report.semester == inferred_semester,
            Report.gpa == request.gpa,
            Report.cgpa == request.cgpa,
            Report.regulation == request.regulation,
            Report.branch == request.branch
        ).order_by(Report.created_at.desc()).first()

        if existing_duplicate:
            # Check if subjects match too? For now, if metadata matches, it's likely a duplicate sync.
            return {
                "status": "success",
                "message": "Report already exists, skipping duplicate save",
                "report_id": existing_duplicate.id
            }

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
    try:
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        if not user:
            return {"status": "success", "reports": [], "semesters_present": [], "semester_gpas": []}

        reports = (
            db.query(Report)
            .filter(Report.user_id == user.id)
            .order_by(Report.created_at.desc(), Report.id.desc())
            .all()
        )

        latest_by_sem_code = {}
        for report in reports:
            for subj in report.subjects:
                sem = int(subj.original_semester or report.semester or 1)
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
            gp_map = {"S": 10, "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5}
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
                    "branch": r.branch or "CSE",
                    "regulation": r.regulation or "2021",
                    "total_credits": r.total_credits or 0,
                    "created_at": r.created_at,
                }
                for r in reports
            ],
            "semesters_present": semesters_present,
            "semester_gpas": semester_gpas,
        }
    except Exception as e:
        import traceback
        print(f"Error in get_user_reports for {firebase_uid}: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Reports fetch failed: {e}")


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
    gp_map = {"S": 10, "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5}

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
async def preview_ocr(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    OCR Preview Endpoint — used by the frontend scan flow.
    Integrated with Redis Caching and ImageKit.
    """
    try:
        print(f"[preview-ocr] Received: {file.filename}, type: {file.content_type}")
        if not (file.content_type.startswith('image/') or file.content_type == 'application/pdf'):
            raise HTTPException(status_code=400, detail="File must be an image or PDF")

        contents = await file.read()
        
        # 1. Check Redis Cache First
        cached_result = cache_service.get_ocr_cache(contents)
        if cached_result:
            return cached_result

        # 2. Upload to ImageKit (Transient Storage)
        file_name = file.filename or "marksheet.jpg"
        img_url, file_id = storage_service.upload_image(contents, file_name)

        # 3. Process OCR
        result, error = ocr_service.process_marksheet(contents)
        
        # 4. Schedule cleanup check in background (now that we're keeping images)
        background_tasks.add_task(storage_service.cleanup_old_images, threshold=500)

        if error:
            raise HTTPException(status_code=500, detail=f"OCR Error: {error}")

        if not result:
            raise HTTPException(status_code=500, detail="OCR processing failed")

        # 5. Build subject list in the format the frontend expects
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

        final_result = {
            "subjects": subjects_out,
            "semester_info": result.get('semester_info', {}),
            "confidence": result.get('confidence', {}),
            "status": "preview_ready",
        }

        # 6. Cache the final result in Redis
        cache_service.set_ocr_cache(contents, final_result)

        return final_result

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

        subject_sem_values = {
            int(s.semester) for s in request.subjects
            if getattr(s, 'semester', None) is not None and int(s.semester) > 0
        }
        is_multi_sem_payload = len(subject_sem_values) > 1
        
        # 1. Enrich subjects with credits
        enriched_grades = []
        for s in request.subjects:
            branch_key = request.branch.upper()
            credit_res = curriculum_service.get_credits(s.subject_code, branch_key, request.regulation)
            credits = s.credits if s.credits is not None else credit_res.credits
            subject_semester = credit_res.semester
            
            is_arrear = False
            row_semester = s.semester if s.semester and s.semester > 0 else None

            if is_multi_sem_payload:
                if subject_semester is not None and row_semester is not None and subject_semester != row_semester:
                    is_arrear = True
            else:
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
async def calculate_cgpa(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Upload marksheet image → Extract Grades → Calculate Results
    Integrated with Redis Caching and ImageKit.
    """
    try:
        print(f"[calculate-cgpa] Received: {file.filename}, type: {file.content_type}")
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
            
        contents = await file.read()
        
        # 1. Check Redis Cache First
        cached_result = cache_service.get_ocr_cache(contents)
        result = None
        file_id = None

        if cached_result:
            result = cached_result
        else:
            # 2. Upload to ImageKit (Transient Storage)
            file_name = file.filename or "marksheet.jpg"
            _, file_id = storage_service.upload_image(contents, file_name)

            # 3. Process OCR
            result, error = ocr_service.process_marksheet(contents)
            
            # 4. Schedule cleanup check in background
            background_tasks.add_task(storage_service.cleanup_old_images, threshold=500)

            if error:
                raise HTTPException(status_code=500, detail=f"OCR Error: {error}")

            # 4. Cache & Results
            if result:
                cache_service.set_ocr_cache(contents, result)

        if not result:
            raise HTTPException(status_code=500, detail="OCR processing failed")
            
        # 5. Extract results from OCR response
        extracted_grades = ocr_service.extract_grades_from_result(result)
        if not extracted_grades:
             raise HTTPException(status_code=422, detail="No valid grades detected in the image.")
        
        semester_info = result.get('semester_info', {})
        semester = semester_info.get('semester') or 1
        
        # 6. Enrich grades with curriculum credits
        enriched_grades = []
        for grade in extracted_grades:
            subject_code = grade.get('subject', '')
            credits = curriculum_service.get_credits(subject_code, 'CSE')
            subject_semester = curriculum_service.get_semester(subject_code, 'CSE')
            
            is_fail_grade = grade.get('grade', '').upper() in ['RA', 'U', 'AB', 'F', 'W', 'SA']
            is_arrear = (subject_semester is not None and semester is not None and subject_semester < semester - 1) or is_fail_grade
            
            enriched_grade = {
                'subject': subject_code,
                'grade': grade.get('grade', ''),
                'credits': credits,
                'marks': grade.get('marks'),
                'original_semester': subject_semester if subject_semester else (grade.get('original_semester') or semester),
                'is_arrear': is_arrear
            }
            enriched_grades.append(enriched_grade)
        
        # 7. Perform Calculation
        calculator = AnnaUniversityCGPA(curriculum_service=curriculum_service)
        calc_result = calculator.calculate_cgpa_from_grades(enriched_grades, semester)
        
        # 8. Add marks to subject details if available from OCR result
        details = calc_result.get('subjects', {})
        if result.get('subjects'):
            for subject_data in result['subjects']:
                code = subject_data.get('subject_code')
                if code in details and subject_data.get('marks') is not None:
                    details[code]['marks'] = subject_data['marks']

        # Add metadata for frontend
        response = {
            "gpa": calc_result.get('gpa', 0.0),
            "cgpa": calc_result.get('cgpa', 0.0),
            "percentage": f"{calculator.calculate_percentage(calc_result.get('cgpa', 0.0))}%",
            "class": calc_result.get('class', 'First Class'),
            "total_subjects": len(details),
            "subjects": details,
            "semester_gpas": calc_result.get('semester_gpas', []),
            "semester_credits": calc_result.get('semester_credits', 0),
            "total_credits": calc_result.get('total_credits', 0),
            "arrear_subjects": calc_result.get('arrear_subjects', 0),
            "passed_subjects": calc_result.get('passed_subjects', 0),
            "failed_subjects": calc_result.get('failed_subjects', 0),
            "status": "success",
            "confidence": result.get('confidence', {}),
            "semester_info": semester_info,
            "processing_info": result.get('processing_info', {}),
        }
        
        return response
        
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        print(f"Error in calculate_cgpa: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
from pydantic import BaseModel
from typing import Optional

class FeedbackCreate(BaseModel):
    user_id: Optional[int] = None
    reaction: int
    comment: str

@app.post("/feedback")
def submit_feedback(data: FeedbackCreate, db: Session = Depends(get_db)):
    try:
        new_feedback = Feedback(
            user_id=data.user_id,
            reaction=data.reaction,
            comment=data.comment
        )
        db.add(new_feedback)
        db.commit()
        db.refresh(new_feedback)
        return {"status": "success", "id": new_feedback.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/feedbacks")
def get_feedbacks(db: Session = Depends(get_db)):
    feedbacks = db.query(Feedback).order_by(Feedback.created_at.desc()).all()
    return feedbacks

@app.post("/referrals/apply")
async def apply_referral(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    ref_code = data.get("referral_code", "").strip().upper()
    firebase_uid = data.get("firebase_uid")

    if not ref_code or not firebase_uid:
        raise HTTPException(status_code=400, detail="Missing referral code or UID")

    # 1. Find the referee (current user)
    referee = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not referee:
        raise HTTPException(status_code=404, detail="User not found")

    if referee.applied_referral_code:
        raise HTTPException(status_code=400, detail="You have already applied a referral code")

    # Prevent self-referral
    if referee.referral_code == ref_code:
        raise HTTPException(status_code=400, detail="You cannot refer yourself")

    # 2. Find the referrer
    referrer = db.query(User).filter(User.referral_code == ref_code).first()
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    # 3. Process rewards
    # Increment referrer's count
    referrer.referrals_count += 1
    
    # Referrer Rewards
    # Logic: 1st referral gives 1 month, 10th gives 1 year.
    # For now, we set is_pro=True as a simplified flag.
    if referrer.referrals_count >= 1 or referrer.referrals_count >= 10:
        referrer.is_pro = True

    # Referee Reward: 1 month Pro
    referee.is_pro = True
    referee.applied_referral_code = ref_code

    db.commit()
    return {
        "status": "success", 
        "message": "Referral applied! You and your friend now have Pro access.",
        "referrals_count": referrer.referrals_count
    }

