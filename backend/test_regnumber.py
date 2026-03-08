"""Quick test: run the sem-5 test image through OCR v3 and check for register number leak."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ocr_service_v3 import SevenLayerOCRService
from curriculum_service import CurriculumService

cs = CurriculumService()
svc = SevenLayerOCRService(curriculum_service=cs, debug=True)

test_img = os.path.join("test", "Screenshot 2025-04-04 222927.png")
with open(test_img, 'rb') as f:
    data = f.read()

result = svc.process_marksheet(data)
subjects = result.get('subjects', [])

print(f"\n{'='*60}")
print(f"Total subjects extracted: {len(subjects)}")
print(f"{'='*60}")
for s in subjects:
    code = s['subject_code']
    grade = s['grade']
    # Flag suspicious
    flag = ""
    if code.isdigit():
        flag = " ** REGISTER NUMBER LEAK **"
    elif len(code) > 7:
        flag = " ** OVERLONG CODE **"
    elif not code[0].isalpha():
        flag = " ** NO ALPHA PREFIX **"
    print(f"  {code:10s}  {grade:4s}{flag}")

print(f"\n{'='*60}")
# Check for known bad tokens
bad_codes = [s for s in subjects if s['subject_code'].isdigit() or len(s['subject_code']) > 7]
if bad_codes:
    print(f"FAILED: {len(bad_codes)} register number(s) leaked through!")
else:
    print("PASSED: No register number leaks detected.")
