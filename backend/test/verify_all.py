import sys
import os
import json
import numpy as np
import cv2
import time

# Add backend to path to import services
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ocr_service_v3 import SevenLayerOCRService
from curriculum_service import CurriculumService
from calculator import AnnaUniversityCGPA

def verify_all():
    print("="*80)
    print("COMPREHENSIVE OCR & CALCULATION VERIFICATION")
    print("="*80)

    # Initialize Services
    curriculum_service = CurriculumService()
    ocr_service = SevenLayerOCRService(curriculum_service=curriculum_service, debug=False)
    cgpa_calculator = AnnaUniversityCGPA(curriculum_service=curriculum_service)

    test_dir = r'D:\CGPA Calculator\backend\test'
    images = [f for f in os.listdir(test_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    
    overall_results = []

    for img_name in images:
        img_path = os.path.join(test_dir, img_name)
        print(f"\nProcessing: {img_name}")
        
        try:
            with open(img_path, 'rb') as f:
                image_bytes = f.read()
            
            # 1. OCR Extraction
            start_time = time.time()
            result, error = ocr_service.process_marksheet(image_bytes)
            elapsed = time.time() - start_time
            
            if error:
                print(f"  [Error] OCR: {error}")
                overall_results.append({
                    "image": img_name,
                    "status": "ERROR",
                    "error": error
                })
                continue
            
            # 2. Data Transformation (Adapter)
            grades_list = ocr_service.extract_grades_from_result(result)
            
            # 3. GPA Calculation
            # Get semester from result if available, else default to 1
            semester = result.get('semester_info', {}).get('semester', 1) or 1
            calc_result = cgpa_calculator.calculate_cgpa_from_grades(grades_list, semester=semester)
            
            print(f"  - Subjects Found: {len(grades_list)}")
            print(f"  - GPA: {calc_result['gpa']:.2f}")
            print(f"  - CGPA: {calc_result['cgpa']:.2f}")
            print(f"  - Extraction Time: {elapsed:.2f}s")
            
            # Print subject details for visual verification
            for g in grades_list:
                print(f"    - {g['subject']}: {g['grade']} (Credits: {g['credits']})")
            
            overall_results.append({
                "image": img_name,
                "status": "SUCCESS",
                "subjects_count": len(grades_list),
                "gpa": calc_result['gpa'],
                "cgpa": calc_result['cgpa'],
                "extraction_time": elapsed,
                "subjects": grades_list,
                "semester_info": result.get('semester_info', {})
            })
            
        except Exception as e:
            print(f"  [Exception]: {str(e)}")
            overall_results.append({
                "image": img_name,
                "status": "EXCEPTION",
                "error": str(e)
            })

    # Save results
    output_path = os.path.join(test_dir, 'full_verification_results.json')
    with open(output_path, 'w') as f:
        json.dump(overall_results, f, indent=2)
    
    print("\n" + "="*80)
    print(f"VERIFICATION COMPLETE. Results saved to {output_path}")
    print("="*80)

if __name__ == "__main__":
    verify_all()
