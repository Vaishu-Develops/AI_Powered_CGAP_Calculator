from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import os
from calculator import AnnaUniversityCGPA
from ocr_service_v3 import SevenLayerOCRService
from curriculum_service import CurriculumService

# Initialize App
app = FastAPI(
    title="Anna University CGPA Calculator API",
    description="API to extract grades from marksheets and calculate CGPA/GPA using production-grade 7-layer OCR pipeline.",
    version="3.0.0"
)

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

class ManualSubject(BaseModel):
    subject_code: str
    grade: str
    semester: Optional[int] = 1

class CalculateRequest(BaseModel):
    subjects: List[ManualSubject]
    semester: int = 1
    regulation: str = "2021"
    branch: str = "CSE"

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
        subjects_out = []
        for s in raw_subjects:
            subjects_out.append({
                "subject_code": s.get('subject_code', ''),
                "grade": s.get('grade', ''),
                "marks": s.get('marks'),
                "confidence": s.get('confidence', 1.0),
                "semester": result.get('semester_info', {}).get('semester'),
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
        
        # 1. Enrich subjects with credits from curriculum service using the provided branch
        enriched_grades = []
        for s in request.subjects:
            # Normalize branch name to uppercase/code used in data files
            branch_key = request.branch.upper()
            
            # get_credits returns a CreditResult object
            credit_res = curriculum_service.get_credits(s.subject_code, branch_key, request.regulation)
            credits = credit_res.credits
            subject_semester = credit_res.semester
            
            # For manual entry, we trust the semester passed by the user or the curriculum
            # If curriculum says 3, but user is in sem 5, it's an arrear.
            is_arrear = False
            if subject_semester is not None:
                is_arrear = subject_semester != request.semester
                
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
        
        percentage = cgpa_calculator.calculate_percentage(cgpa)
        class_div = calc_result.get('class', cgpa_calculator.get_class_division(cgpa))
        
        return {
            "gpa": gpa,
            "cgpa": cgpa,
            "percentage": f"{percentage}%",
            "class": class_div,
            "total_subjects": len(details),
            "subjects": details,
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
            # - A subject is an arrear only if its original semester is EXPLICITLY LESS than current marksheet semester
            # - OR if the grade is explicitly a fail grade (RA, U, AB, F)
            is_arrear = False
            is_fail_grade = grade.get('grade', '').upper() in ['RA', 'U', 'AB', 'F', 'W', 'SA']
            
            # Use detected semester if valid (not just default 1 if detection failed)
            current_sem = semester if semester_info.get('semester') else None
            
            if current_sem and subject_semester is not None:
                is_arrear = subject_semester < current_sem or is_fail_grade
            elif current_sem and grade.get('original_semester'):
                is_arrear = grade['original_semester'] < current_sem or is_fail_grade
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
