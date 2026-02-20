"""
Compare raw vs preprocessed OCR tokens
"""
from paddleocr import PaddleOCR
import cv2
import numpy as np
from ocr_service_v2 import EnhancedOCRService
import re

SUBJECT_CODE_RE = re.compile(r'([A-Z]{2,4}\d{3,5})\b', re.IGNORECASE)

image_path = r"D:\CGPA Calculator\backend\test\2017 Mark.webp"

# Read image
img = cv2.imread(image_path)
ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)

# RAW OCR
print("=" * 80)
print("RAW OCR (no preprocessing)")
print("=" * 80)
raw_result = ocr.ocr(img, cls=True)
raw_codes = []
if raw_result and raw_result[0]:
    for line in raw_result[0]:
        text = line[1][0]
        codes = SUBJECT_CODE_RE.findall(text.upper())
        if codes:
            print(f"  {text} -> codes: {codes}")
            raw_codes.extend(codes)
print(f"\nRaw subject codes: {raw_codes}")
print(f"Raw total tokens: {len(raw_result[0]) if raw_result and raw_result[0] else 0}")

# PREPROCESSED OCR
print("\n" + "=" * 80)
print("PREPROCESSED OCR")
print("=" * 80)
svc = EnhancedOCRService(debug=False)
preprocessed = svc._preprocess_image(img)
prep_result = ocr.ocr(preprocessed, cls=True)
prep_codes = []
if prep_result and prep_result[0]:
    for line in prep_result[0]:
        text = line[1][0]
        codes = SUBJECT_CODE_RE.findall(text.upper())
        if codes:
            print(f"  {text} -> codes: {codes}")
            prep_codes.extend(codes)
print(f"\nPreprocessed subject codes: {prep_codes}")
print(f"Preprocessed total tokens: {len(prep_result[0]) if prep_result and prep_result[0] else 0}")

# COMPARISON
print("\n" + "=" * 80)
print("COMPARISON")
print("=" * 80)
raw_set = set(raw_codes)
prep_set = set(prep_codes)
print(f"In raw only:          {raw_set - prep_set}")
print(f"In preprocessed only: {prep_set - raw_set}")
print(f"In both:              {raw_set & prep_set}")
print(f"\nBM8351 in raw: {'BM8351' in raw_set}")
print(f"BM8351 in preprocessed: {'BM8351' in prep_set}")
