import sys
import os
import cv2
import numpy as np
import logging
import re

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ocr_service_v3 import SevenLayerOCRService

def test_reval():
    # Setup logging to see internal layers
    logging.basicConfig(level=logging.DEBUG)
    
    ocr = SevenLayerOCRService(debug=True)
    
    img_path = r"d:\CGPA Calculator\backend\test\Screenshot 2025-10-26 140425.png"
    if not os.path.exists(img_path):
        print(f"Error: Image not found at {img_path}")
        return

    with open(img_path, 'rb') as f:
        image_data = f.read()

    print(f"Testing revaluation reproduction with: {os.path.basename(img_path)}")
    print("=" * 100)
    
    result, error = ocr.process_marksheet(image_data)
    
    if error:
        print(f"OCR Error: {error}")
        return

    # Inspect internal rows if possible
    if ocr.debug:
        print("\nROW GROUPING PREVIEW:")
        tokens_raw = ocr.layer3_recognize_text(cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR))
        prep = ocr.layer1_preprocess(cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR))
        tokens_prep = ocr.layer3_recognize_text(prep) if prep is not None else []
        tokens = ocr._merge_token_sets(tokens_raw, tokens_prep)
        rows = ocr.layer4_group_rows(tokens)
        for r in rows:
            txt = ' '.join([t.text for t in r.tokens])
            print(f"  Row {r.row_index} (Y={r.y_position}): {txt}")

    print("\nEXTRACTED SUBJECTS:")
    print(f"{'Code':<15} {'Grade':<10} {'IsReval':<10} {'Semester':<10}")
    print("-" * 50)
    
    target_reval = {'CS3551', 'CS3452'}
    found_reval = set()
    
    for s in result.get('subjects', []):
        code = s.get('subject_code')
        grade = s.get('grade')
        is_reval = s.get('is_revaluation', False)
        sem = s.get('semester')
        
        print(f"{code:<15} {grade:<10} {str(is_reval):<10} {str(sem):<10}")
        
        if code in target_reval and is_reval:
            found_reval.add(code)

    print("\nREVALUATION CHECK:")
    for code in target_reval:
        status = "FOUND (REVAL)" if code in found_reval else "MISSING REVAL OR WRONG GRADE"
        print(f"  {code}: {status}")

if __name__ == "__main__":
    test_reval()
