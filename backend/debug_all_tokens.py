"""
Debug script to see ALL OCR tokens from the marksheet
This will help identify if a subject is being missed
"""

import cv2
import numpy as np
from pathlib import Path
from ocr_service_v2 import EnhancedOCRService
from curriculum_service import CurriculumService

def debug_tokens():
    image_path = r"D:\CGPA Calculator\backend\test\2017 Mark.webp"
    print(f"🔍 Analyzing all OCR tokens from: {Path(image_path).name}\n")
    
    # Load image
    with open(image_path, 'rb') as f:
        image_bytes = f.read()
    
    # Initialize service with debug mode
    curriculum = CurriculumService()
    ocr = EnhancedOCRService(debug=True)
    
    # Process image
    result, error = ocr.process_marksheet(image_bytes)
    
    if error:
        print(f"❌ Error: {error}")
        return
    
    # Extract detailed information
    grades = ocr.extract_grades_from_result(result)
    
    print(f"\n{'='*70}")
    print(f"📊 SUMMARY")
    print(f"{'='*70}")
    print(f"✅ Total subjects extracted: {len(grades['subjects'])}")
    print(f"📋 Regulation: {grades.get('regulation', 'Not detected')}")
    print(f"🆔 Register: {grades.get('student_info', {}).get('register_number', 'Not detected')}")
    
    print(f"\n{'='*70}")
    print(f"📝 EXTRACTED SUBJECTS")
    print(f"{'='*70}")
    for i, subj in enumerate(grades['subjects'], 1):
        code = subj['subject_code']
        grade = subj['grade']
        marks = subj.get('marks', 'N/A')
        print(f"{i:2}. {code:8} → {grade:3} (marks: {marks})")
    
    # Check for duplicate codes
    codes = [s['subject_code'] for s in grades['subjects']]
    if len(codes) != len(set(codes)):
        print(f"\n🔄 DUPLICATE SUBJECT CODES FOUND:")
        from collections import Counter
        for code, count in Counter(codes).items():
            if count > 1:
                print(f"  • {code}: appears {count} times")
    else:
        print(f"\n✅ All subject codes are unique (no revaluation results detected)")
    
    # Show all tokens with subject codes
    print(f"\n{'='*70}")
    print(f"🔤 ALL TOKENS CONTAINING SUBJECT CODE PATTERNS")
    print(f"{'='*70}")
    
    import re
    code_pattern = re.compile(r'([A-Z]{2,4}\d{3,5})', re.IGNORECASE)
    
    if 'ocr_result' in result:
        all_text = []
        for line in result['ocr_result']:
            text = line[1][0]
            conf = line[1][1]
            all_text.append((text, conf))
            
            # Check if contains subject code pattern
            matches = code_pattern.findall(text)
            if matches:
                print(f"  📍 {text:40} (conf: {conf:.2f}) → {matches}")
    
    print(f"\n{'='*70}")
    print(f"Expected: 10 subjects (including revaluation)")
    print(f"Found: {len(grades['subjects'])} subjects")
    if len(grades['subjects']) < 10:
        print(f"⚠️ Missing {10 - len(grades['subjects'])} subject(s)")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    debug_tokens()
