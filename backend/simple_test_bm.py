"""
Direct test - print all subject codes found
"""
from ocr_service_v2 import EnhancedOCRService

ocr_service = EnhancedOCRService(debug=False)

image_path = r"D:\CGPA Calculator\backend\test\2017 Mark.webp"

with open(image_path, 'rb') as f:
    image_bytes = f.read()

result, error = ocr_service.process_marksheet(image_bytes)

if error:
    print(f"ERROR: {error}")
    exit(1)

print("EXTRACTED SUBJECTS:")
print("=" * 60)

subjects = result.get('subjects', [])
print(f"Total: {len(subjects)}\n")

bm_found = False
for i, subj in enumerate(subjects, 1):
    code = subj.get('subject_code', 'UNKNOWN')
    grade = subj.get('grade', '?')
    
    if 'BM' in code:
        print(f"{i}. *** {code}: {grade} *** <- BM CODE FOUND!")
        bm_found = True
    else:
        print(f"{i}. {code}: {grade}")

print("\n" + "=" * 60)
if bm_found:
    print("SUCCESS: BM8351 was extracted")
else:
    print("FAILURE: BM8351 is missing")
    print("\nExpected 10 subjects (including BM8351), got", len(subjects))
