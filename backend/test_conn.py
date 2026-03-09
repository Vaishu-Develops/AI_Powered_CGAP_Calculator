# -*- coding: utf-8 -*-
"""Quick connectivity test for /preview-ocr/ endpoint."""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import requests

# First test root endpoint
try:
    r = requests.get("http://localhost:8000/")
    print(f"GET / status: {r.status_code}")
    print(f"GET / body: {r.text[:200]}")
except Exception as e:
    print(f"GET / error: {e}")

# Test preview-ocr with a small image
test_img = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test", "download.png")
if os.path.exists(test_img):
    try:
        with open(test_img, 'rb') as f:
            r = requests.post("http://localhost:8000/preview-ocr/", files={"file": ("test.png", f, "image/png")})
        print(f"\nPOST /preview-ocr/ status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Subjects: {len(data.get('subjects', []))}")
        else:
            print(f"Error: {r.text[:300]}")
    except Exception as e:
        print(f"POST /preview-ocr/ error: {e}")
else:
    print(f"Test image not found: {test_img}")
