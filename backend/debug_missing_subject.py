"""
Debug script to find missing BM8351 subject
"""
from ocr_service_v2 import EnhancedOCRService
from curriculum_service import CurriculumService
import json

# Initialize
curriculum_service = CurriculumService()
ocr_service = EnhancedOCRService(curriculum_service=curriculum_service, debug=True)

# Test image
image_path = r"D:\CGPA Calculator\backend\test\2017 Mark.webp"

print("🔍 DEBUGGING MISSING BM8351 SUBJECT")
print("=" * 80)

# Extract with detailed logging
result = ocr_service.extract_grades_from_image(image_path)

print("\n" + "=" * 80)
print("📊 EXTRACTED SUBJECTS:")
print("=" * 80)
for i, subj in enumerate(result.get('subjects', []), 1):
    print(f"{i}. {subj['code']}: {subj['grade']}")

print("\n" + "=" * 80)
print(f"📈 TOTAL SUBJECTS FOUND: {len(result.get('subjects', []))}")
print("=" * 80)

# Check if BM8351 is in the results
codes = [s['code'] for s in result.get('subjects', [])]
if 'BM8351' in codes:
    print("\n✅ BM8351 FOUND in results")
else:
    print("\n❌ BM8351 MISSING from results")
    print("\n🔍 Searching for 'BM8351' or 'BM' in debug output above...")
