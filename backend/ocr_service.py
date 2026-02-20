from paddleocr import PaddleOCR
import cv2
import numpy as np
import os
import re

class OCRService:
    def __init__(self, lang='en'):
        # Use lazy initialization to avoid blocking server startup
        self.lang = lang
        self.engine = None
        self._initialized = False
    
    def _ensure_initialized(self):
        """Lazy initialization of PaddleOCR engine"""
        if not self._initialized:
            try:
                print("Initializing PaddleOCR engine (this may take a moment on first run)...")
                self.engine = PaddleOCR(use_angle_cls=True, lang=self.lang)
                self._initialized = True
                print("PaddleOCR engine initialized successfully!")
            except Exception as e:
                print(f"Failed to initialize PaddleOCR: {e}")
                self.engine = None
                self._initialized = True  # Mark as attempted to avoid repeated failures

    def process_image(self, image_bytes):
        # Ensure OCR engine is initialized (lazy loading)
        self._ensure_initialized()
        
        if not self.engine:
            return None, "OCR Engine not initialized"

        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return None, "Could not decode image"

            # Run OCR - PaddleOCR returns list of [bbox, (text, confidence)]
            result = self.engine.ocr(img)
            
            # Extract all text from OCR result
            extracted_text = ""
            if result and result[0]:
                for line in result[0]:
                    if line and len(line) > 1:
                        text = line[1][0]  # line[1] is (text, confidence)
                        extracted_text += text + "\n"
            
            # For this specific task (Marksheet), we often just need to find "Subject Code", "Grade" etc.
            # A simple regex over the string representation of the result might work as a first pass,
            # or we rely on the caller to use the structure.
            
            # Let's return the raw result for the calling service to parse,
            # Or simplified: structured_data = ...
            
            # Actually, let's just return the raw text of everything found for regex parsing first,
            # as the prompt example parsed `str(result)`.
            
            return result, None
            
        except Exception as e:
            return None, str(e)

    def extract_grades_from_result(self, result):
        """
        Parses the PaddleOCR result to find grades for subjects.
        This is a heuristic based on the Anna University marksheet format.
        """
        grades_list = []
        
        # Extract text from PaddleOCR result format
        text_lines = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) > 1:
                    text = line[1][0]  # line[1] is (text, confidence)
                    text_lines.append(text.upper())
        
        # Join all text for pattern matching
        text_blob = " ".join(text_lines)
        
        # Find all valid grades in the text
        grade_pattern = r'\b(O|A\+|A|B\+|B|C|P|RA|U|W|AB|SA)\b'
        matches = re.findall(grade_pattern, text_blob)
        
        # Create grade entries
        for i, grade in enumerate(matches):
            grades_list.append({
                'subject': f"Subject {i+1}",
                'grade': grade,
                'credits': 3  # Default credits
            })

        return grades_list
