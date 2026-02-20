import sys
import os
import json
import numpy as np
import cv2

# Add backend to path to import service
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ocr_service_v3 import SevenLayerOCRService

def verify_v3():
    # Initialize Service
    service = SevenLayerOCRService(debug=True)
    service._ensure_initialized()
    
    # Image Path
    img_path = r'D:\CGPA Calculator\backend\test\portal5.png'
    
    if not os.path.exists(img_path):
        print(f"Error: Image not found at {img_path}")
        return

    # Read image as bytes
    with open(img_path, 'rb') as f:
        image_bytes = f.read()

    print("Running SevenLayerOCRService (v3) on portal5.png...")
    # Add debug for tokens
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    tokens = service.layer3_recognize_text(img)
    print("\n--- ALL RECOGNIZED TOKENS (RAW PASS) ---")
    for t in sorted(tokens, key=lambda x: (x.center_y, x.center_x)):
        print(f"[{t.center_y}, {t.center_x}] {t.text} (conf: {t.confidence:.2f})")
    print("---------------------------------------\n")

    result, error = service.process_marksheet(image_bytes)

    if error:
        print(f"OCR Error: {error}")
        return

    # Extract clean list for display (using v3 to v1/v2 adapter)
    extracted = service.extract_grades_from_result(result)

    print("\n" + "="*60)
    print(f"{'Subject Code':<15} | {'Grade':<10} | {'Marks':<10} | {'Credits':<10}")
    print("-" * 60)
    for row in extracted:
        subject = row.get('subject', 'N/A')
        grade = row.get('grade', 'N/A')
        marks = row.get('marks', 'N/A')
        credits = row.get('credits', 'N/A')
        print(f"{subject:<15} | {grade:<10} | {marks:<10} | {credits:<10}")
    print("="*60)

    # Output detailed confidence
    conf = result.get('confidence', {})
    metadata = result.get('processing_info', {})
    print(f"\nOverall Confidence: {conf.get('overall', 0):.2f} - {conf.get('rating', 'N/A')}")
    print(f"Subjects Found: {len(result.get('subjects', []))}")
    print(f"Total Rows Detected: {metadata.get('total_rows_detected', 0)}")
    print(f"Processing Time: {metadata.get('processing_time_ms', 0)}ms")
    
    # Save detailed JSON for analysis
    with open('backend/test/v3_ocr_verification.json', 'w') as f:
        json.dump(result, f, indent=2)
    print("\nDetailed v3 results saved to backend/test/v3_ocr_verification.json")

if __name__ == "__main__":
    verify_v3()
