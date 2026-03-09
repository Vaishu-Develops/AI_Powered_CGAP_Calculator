# -*- coding: utf-8 -*-
"""Diagnostic: dump raw PaddleOCR tokens for Sem 2 and Sem 5 to find what's detected."""
import sys, io, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Use the running API to get debug info
import requests, json

API_URL = "http://localhost:8000/preview-ocr/"
TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test")

problem_files = [
    ("Sem 2", "WhatsApp Image 2026-03-03 at 17.30.16.png", ["GE3251", "GE3252", "GE3271"]),
    ("Sem 5", "Screenshot 2025-04-04 222927.png", ["CS3501", "CS3492"]),
]

for label, filename, missing in problem_files:
    filepath = os.path.join(TEST_DIR, filename)
    print(f"\n{'='*70}")
    print(f"  {label} -- {filename}")
    print(f"  Missing: {missing}")
    print(f"{'='*70}")
    
    with open(filepath, 'rb') as f:
        resp = requests.post(API_URL, files={"file": (filename, f, "image/png")})
    
    data = resp.json()
    subjects = data.get('subjects', [])
    proc_info = data.get('processing_info', {})
    
    print(f"\n  Extracted {len(subjects)} subjects:")
    for s in subjects:
        code = s.get('subject_code', '?')
        grade = s.get('grade', '?')
        orig = s.get('original_code', '')
        status = s.get('validation_status', '?')
        reval = s.get('is_revaluation', False)
        flags = []
        if orig: flags.append(f"corrected from {orig}")
        if reval: flags.append("REVAL")
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        print(f"    {code:10s} {grade:4s} ({status}){flag_str}")
    
    print(f"\n  Processing info:")
    print(f"    Total rows detected: {proc_info.get('total_rows_detected', '?')}")
    print(f"    Duplicates removed: {proc_info.get('duplicates_removed', '?')}")
    print(f"    Codes auto-corrected: {proc_info.get('codes_auto_corrected', '?')}")
    print(f"    Codes verified: {proc_info.get('codes_verified', '?')}")
    print(f"    Codes unverified: {proc_info.get('codes_unverified', '?')}")
    
    corrections = proc_info.get('corrections', [])
    if corrections:
        print(f"\n  Corrections applied:")
        for c in corrections:
            print(f"    {c}")
