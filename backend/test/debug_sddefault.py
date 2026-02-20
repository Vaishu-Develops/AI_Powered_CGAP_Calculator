import sys
import os
import cv2
import numpy as np
import json

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ocr_service_v3 import SevenLayerOCRService
from curriculum_service import CurriculumService

def debug_sddefault():
    cur_service = CurriculumService()
    print(f"Loaded {len(cur_service._subject_db)} subjects from curriculum")
    service = SevenLayerOCRService(curriculum_service=cur_service, debug=True)
    service._ensure_initialized()
    
    img_path = r'D:\CGPA Calculator\backend\test\sddefault.jpg'
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found")
        return

    with open(img_path, 'rb') as f:
        image_bytes = f.read()

    raw_img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    
    print("\n--- DEBUGGING sddefault.jpg ---")
    
    # 1. Test Raw Pass
    print("\n[Pass 2: Raw]")
    t2 = service.layer3_recognize_text(raw_img)
    for t in sorted(t2, key=lambda x: (x.center_y, x.center_x)):
        print(f"[{t.center_y}, {t.center_x}] {t.text} (conf: {t.confidence:.2f})")

    # 2. Test Multi-pass merge
    prep = service.layer1_preprocess(raw_img)
    t1 = service.layer3_recognize_text(prep) if prep is not None else []
    
    gray = cv2.cvtColor(raw_img, cv2.COLOR_BGR2GRAY)
    _, th = cv2.threshold(cv2.GaussianBlur(gray, (5,5), 0), 0, 255, cv2.THRESH_BINARY+cv2.THRESH_OTSU)
    t3 = service.layer3_recognize_text(cv2.cvtColor(th, cv2.COLOR_GRAY2BGR))
    
    tokens = service._merge_token_sets(t2, t1)
    tokens = service._merge_token_sets(tokens, t3)
    
    # 2.5 Test ROI Recovery specifically for NM1066 if it exists
    service.debug = True 
    
    print("\n--- MERGED TOKENS ---")
    for t in sorted(tokens, key=lambda x: (x.center_y, x.center_x)):
        print(f"[{t.center_y}, {t.center_x}] {t.text} (conf: {t.confidence:.2f})")

    # 3. Analyze Grouping
    rows = service.layer4_group_rows(tokens, raw_img=raw_img)
    print(f"\nDetected {len(rows)} rows")
    for r in rows:
        txt = ' | '.join([t.text for t in r.tokens])
        print(f"Row {r.row_index} (y={r.y_position}): {txt}")

    # 5. Full Pipeline Test
    print("\n--- FULL PIPELINE RESULT ---")
    result, error = service.process_marksheet(image_bytes)
    if error:
        print(f"Error: {error}")
    else:
        for s in result['subjects']:
            print(f"Code: {s['subject_code']}, Grade: {s['grade']}, Credits: {s.get('credits')}")
        print(f"\nMetadata: {result['processing_info']}")

if __name__ == "__main__":
    debug_sddefault()
