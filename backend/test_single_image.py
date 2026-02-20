#!/usr/bin/env python3
"""
Single Image OCR Test
Test OCR extraction on specific marksheet image
"""

import os
import time
from ocr_service_v2 import EnhancedOCRService
from curriculum_service import CurriculumService

def test_single_image():
    """Test OCR extraction on 2017 Mark.webp"""
    
    # Image path
    image_path = r"D:\CGPA Calculator\backend\test\2017 Mark.webp"
    
    print("🚀 TESTING SINGLE IMAGE OCR EXTRACTION")
    print("=" * 60)
    print(f"📁 Image: {os.path.basename(image_path)}")
    print(f"📂 Path: {image_path}")
    
    # Check if image exists
    if not os.path.exists(image_path):
        print(f"❌ Error: Image not found at {image_path}")
        return
    
    print(f"✅ Image found ({os.path.getsize(image_path)} bytes)")
    print()
    
    try:
        # Initialize services
        print("⚙️ Initializing services...")
        curriculum_service = CurriculumService()
        ocr_service = EnhancedOCRService(debug=True)
        print("✅ Services initialized")
        print()
        
        # Process image
        print("🔍 Starting OCR extraction...")
        start_time = time.time()
        
        # Read image as bytes
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        
        # Process with OCR service
        result, error = ocr_service.process_marksheet(image_bytes)
        
        processing_time = time.time() - start_time
        print(f"⏱️ Processing completed in {processing_time:.2f} seconds")
        print()
        
        # Check for errors
        if error:
            print(f"❌ Error during processing: {error}")
            return
            
        if not result:
            print("❌ No result returned from OCR processing")
            return
        
        # Display results
        print("📊 EXTRACTION RESULTS")
        print("-" * 40)
        
        # Extract subjects using the correct method
        subjects = result.get('subjects', [])
        confidence = result.get('confidence', {})
        student_info = result.get('student_info', {})
        
        if subjects:
            print(f"📚 Total subjects found: {len(subjects)}")
            
            # Display confidence info
            if isinstance(confidence, dict):
                overall_conf = confidence.get('overall', 0)
                ocr_conf = confidence.get('ocr', 0)
                extraction_conf = confidence.get('extraction', 0)
                print(f"🎯 Overall confidence: {overall_conf:.1f}%")
                print(f"📝 OCR confidence: {ocr_conf:.1f}%")
                print(f"🔍 Extraction confidence: {extraction_conf:.1f}%")
            else:
                print(f"🎯 Confidence: {confidence}")
                
            # Display student info
            regulation = student_info.get('regulation', 'Not detected')
            semester = student_info.get('semester', 'Not detected')
            register = student_info.get('register_number', 'Not detected')
            print(f"📋 Regulation: {regulation}")
            print(f"📖 Semester: {semester}")
            print(f"🆔 Register: {register}")
            print()
            
            print("📝 EXTRACTED SUBJECTS:")
            print("-" * 30)
            
            for i, subject in enumerate(subjects, 1):
                code = subject.get('subject_code', 'Unknown')
                grade = subject.get('grade', 'N/A')
                marks = subject.get('marks', 'N/A')
                
                print(f"{i:2d}. {code}: {grade}")
                if marks and marks != 'N/A':
                    print(f"     Marks: {marks}")
                print()
                
        else:
            print("❌ No subjects extracted")
            print("🔍 Raw result structure:")
            for key, value in result.items():
                if key == 'raw_text':
                    print(f"  {key}: [Text omitted - {len(str(value))} chars]")
                else:
                    print(f"  {key}: {value}")
                    
            
    except Exception as e:
        print(f"❌ Error during processing: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_single_image()