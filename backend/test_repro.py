import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'

from ocr_service_v3 import SevenLayerOCRService
from curriculum_service import CurriculumService
import cv2
import numpy as np
import json

# Initialize services
curriculum_service = CurriculumService()
ocr = SevenLayerOCRService(curriculum_service=curriculum_service, debug=True)
ocr._ensure_initialized()

# Test image
img_path = r'C:\Users\ADMIN\.gemini\antigravity\brain\83a96299-1377-4eb1-baf6-6312f232ea57\media__1772896348001.png'

if not os.path.exists(img_path):
    print(f"Image not found: {img_path}")
    sys.exit(1)

print(f"Testing reproduction with: repro_image.png\n")

with open(img_path, 'rb') as f:
    image_data = f.read()

# Run full pipeline with detailed row logging
result, error = ocr.process_marksheet(image_data)

if error:
    print(f"OCR Error: {error}")
    sys.exit(1)

# Inspect internal rows if possible
if ocr.debug:
    # We can't easily access internal rows unless we rerun grouping
    print("\nROW GROUPING PREVIEW:")
    tokens_raw = ocr.layer3_recognize_text(cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR))
    prep = ocr.layer1_preprocess(cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR))
    tokens_prep = ocr.layer3_recognize_text(prep) if prep is not None else []
    tokens = ocr._merge_token_sets(tokens_raw, tokens_prep)
    rows = ocr.layer4_group_rows(tokens)
    for r in rows:
        txt = ' '.join([t.text for t in r.tokens])
        print(f"  Row {r.row_index} (Y={r.y_position}): {txt}")

print("\n" + "=" * 100)
print("FINAL RESULTS")
print("=" * 100)

if 'confidence' in result:
    print(f"Confidence: {result['confidence'].get('rating', 'N/A')}")
if 'semester_info' in result:
    print(f"Semester Detection: {json.dumps(result['semester_info'], indent=2)}")

subjects = result.get('subjects', [])
print(f"\nExtracted Subjects: {len(subjects)}")
print(f"{'Subject Code':<15} {'Grade':<8} {'Marks':<8} {'Row':<6}")
print("-" * 40)
for s in subjects:
    if isinstance(s, dict):
        print(f"{s.get('subject_code', 'N/A'):<15} {s.get('grade', 'N/A'):<8} {str(s.get('marks', 'N/A')):<8} {s.get('row_index', 'N/A'):<6}")
    else:
        # If it's a list or other format
        print(f"DEBUG: Unexpected subject format: {s}")

# Check for specific missing subjects
target_codes = ['BE3251', 'CS3251', 'CS3271', 'GE3251', 'GE3252', 'GE3271', 'GE3272', 'HS3252', 'MA3251', 'PH3256', 'GE3152', 'MA3151']
found_codes = []
if isinstance(subjects, list):
    found_codes = [s.get('subject_code') if isinstance(s, dict) else "" for s in subjects]

print("\nCHECKING TARGET SUBJECTS:")
for code in target_codes:
    status = "FOUND" if code in found_codes else "MISSING"
    print(f"  {code}: {status}")

# Check for misrecognized versions
print("\nCHECKING FOR MISRECOGNIZED CODES (8 instead of B):")
misrecognized = ['8E3251', '8E3252', '8E3271']
for m_code in misrecognized:
    if any(m_code in str(s) for s in subjects):
        print(f"  {m_code}: Found in output!")

