"""
Debug BM8351 extraction specifically
"""
from ocr_service_v2 import EnhancedOCRService
import json

# Initialize with debug mode
ocr_service = EnhancedOCRService(debug=True)

image_path = r"D:\CGPA Calculator\backend\test\2017 Mark.webp"

print("DEBUGGING BM8351 EXTRACTION")
print("=" * 80)

# Read image bytes
with open(image_path, 'rb') as f:
    image_bytes = f.read()

# Call the full pipeline
result, error = ocr_service.process_marksheet(image_bytes)

if error:
    print(f"Error: {error}")
    exit(1)

print("\n" + "=" * 80)
print("FINAL RESULTS:")
print("=" * 80)

subjects = result.get('subjects', [])
print(f"Total subjects extracted: {len(subjects)}")

# Check if BM8351 is there
bm_found = False
for subj in subjects:
    code = subj.get('code', '')
    if 'BM' in code:
        print(f"*** FOUND: {code}: {subj.get('grade', 'N/A')}")
        bm_found = True

if not bm_found:
    print("\n*** BM8351 NOT in final results")
    print("\nAll extracted codes:")
    for subj in subjects:
        print(f"   - {subj.get('code', 'N/A')}: {subj.get('grade', 'N/A')}")
