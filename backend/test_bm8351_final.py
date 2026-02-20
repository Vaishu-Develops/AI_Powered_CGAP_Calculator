"""
Final debug test for BM8351
"""
from ocr_service_v2 import EnhancedOCRService

# Initialize with debug mode
ocr_service = EnhancedOCRService(debug=True)

image_path = r"D:\CGPA Calculator\backend\test\2017 Mark.webp"

print("=" * 80)
print("DEBUGGING BM8351 EXTRACTION WITH DEBUG LOGGING")
print("=" * 80)

# Read image bytes
with open(image_path, 'rb') as f:
    image_bytes = f.read()

# Process
result, error = ocr_service.process_marksheet(image_bytes)

if error:
    print(f"ERROR: {error}")
    exit(1)

print("\n" + "=" * 80)
print("FINAL RESULTS:")
print("=" * 80)

subjects = result.get('subjects', [])
print(f"Total subjects: {len(subjects)}")

bm_found = False
for subj in subjects:
    code = subj.get('subject_code', '')
    if 'BM' in code:
        print(f"*** FOUND BM CODE: {code} = {subj.get('grade')}")
        bm_found = True
    else:
        print(f"  {code} = {subj.get('grade')}")

if not bm_found:
    print("\n*** BM8351 NOT IN FINAL RESULTS ***")
