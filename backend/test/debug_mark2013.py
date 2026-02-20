import sys
import os
import cv2
import numpy as np

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ocr_service_v3 import SevenLayerOCRService
from curriculum_service import CurriculumService

def debug_mark2013():
    cur_service = CurriculumService()
    service = SevenLayerOCRService(curriculum_service=cur_service, debug=True)
    service._ensure_initialized()
    
    img_path = r'D:\CGPA Calculator\backend\test\Mark2013.png'
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found")
        return

    with open(img_path, 'rb') as f:
        image_bytes = f.read()

    raw_img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)

    print("\n--- RAW TOKENS (Mark2013.png) ---")
    t2 = service.layer3_recognize_text(raw_img)
    for t in sorted(t2, key=lambda x: (x.center_y, x.center_x)):
        print(f"[{t.center_y}, {t.center_x}] {t.text} (conf: {t.confidence:.2f})")

    print("\n--- FULL PIPELINE RESULT (Mark2013.png) ---")
    result, error = service.process_marksheet(image_bytes)
    if error:
        print(f"Error: {error}")
    else:
        for s in result['subjects']:
            print(f"Code: {s['subject_code']}, Grade: {s['grade']}, Credits: {s.get('credits')}, Confidence: {s['confidence']:.2f}")
        print(f"\nMetadata: {result['processing_info']}")

if __name__ == "__main__":
    debug_mark2013()
