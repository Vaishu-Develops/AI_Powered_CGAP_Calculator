import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'

from ocr_service_v2 import EnhancedOCRService

svc = EnhancedOCRService(debug=False)
img = os.path.join(os.path.dirname(__file__), 'test', 'portal5.png')

if not os.path.exists(img):
    print(f"Image not found: {img}")
    sys.exit(1)

print(f"Image: {os.path.basename(img)} ({os.path.getsize(img)} bytes)")

with open(img, 'rb') as f:
    data = f.read()

result, err = svc.process_marksheet(data)
if err:
    print(f"Error: {err}")
    sys.exit(1)

subjects = svc.extract_grades_from_result(result)
info = result.get('student_info', {})
conf = result.get('confidence', {})

print(f"Regulation: {info.get('regulation', 'N/A')}")
print(f"Register: {info.get('register_number', 'N/A')}")
print(f"Semester: {info.get('semester', 'N/A')}")
print(f"Name: {info.get('name', 'N/A')}")
print(f"Confidence: {conf.get('overall', 0):.1%}")
print(f"Total subjects: {len(subjects)}")
print()
for i, s in enumerate(subjects, 1):
    code = s.get('subject_code', 'N/A')
    grade = s.get('grade', 'N/A')
    marks = s.get('marks')
    m = f" (marks={marks})" if marks else ""
    print(f"  {i:>2}. {code}: {grade}{m}")
