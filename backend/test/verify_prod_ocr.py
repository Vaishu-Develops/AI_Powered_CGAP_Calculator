import sys
import os
import json

# Add backend to path to import service
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ocr_service_v2 import EnhancedOCRService

def verify_ocr():
    # Initialize Service
    service = EnhancedOCRService(debug=True)
    
    # Image Path
    img_path = r'D:\CGPA Calculator\backend\test\portal5.png'
    
    if not os.path.exists(img_path):
        print(f"Error: Image not found at {img_path}")
        return

    # Read image as bytes
    with open(img_path, 'rb') as f:
        image_bytes = f.read()

    # Process marksheet
    print("Processing marksheet with EnhancedOCRService v2...")
    result, error = service.process_marksheet(image_bytes)

    if error:
        print(f"OCR Error: {error}")
        return

    # Extract clean list for display
    extracted = service.extract_grades_from_result(result)

    print("\n" + "="*50)
    print(f"{'Subject Code':<15} | {'Grade':<10} | {'Marks':<10}")
    print("-" * 50)
    for row in extracted:
        subject = row.get('subject', 'N/A')
        grade = row.get('grade', 'N/A')
        marks = row.get('marks', 'N/A')
        print(f"{subject:<15} | {grade:<10} | {marks:<10}")
    print("="*50)

    # Output detailed confidence
    conf = result.get('confidence', {})
    print(f"\nOverall Confidence: {conf.get('overall', 0):.2f}")
    print(f"Subjects Found: {conf.get('subjects_found', 0)}")
    
    # Save detailed JSON for user to see
    with open('backend/test/production_ocr_verification.json', 'w') as f:
        json.dump(result, f, indent=2)
    print("\nDetailed results saved to backend/test/production_ocr_verification.json")

if __name__ == "__main__":
    verify_ocr()
