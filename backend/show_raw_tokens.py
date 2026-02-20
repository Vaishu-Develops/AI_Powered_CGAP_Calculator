"""
Simple debug to show ALL raw OCR tokens
"""
from paddleocr import PaddleOCR
import cv2

image_path = r"D:\CGPA Calculator\backend\test\2017 Mark.webp"

print("🔍 RAW OCR TOKEN EXTRACTION")
print("=" * 80)

# Initialize PaddleOCR
ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)

# Read and process image
img = cv2.imread(image_path)
if img is None:
    print("❌ Failed to load image")
    exit(1)

# Run OCR
result = ocr.ocr(img, cls=True)

print("\n📝 ALL DETECTED TEXT TOKENS:")
print("=" * 80)

token_count = 0
bm_found = False

if result and result[0]:
    for line in result[0]:
        text = line[1][0]
        conf = line[1][1]
        
        token_count += 1
        
        # Highlight any token containing "BM" or "8351"
        is_bm = 'BM' in text.upper() or '8351' in text or 'BM8' in text.upper()
        if is_bm:
            print(f"🔴 Token #{token_count}: '{text}' (conf: {conf:.2f}) ← CONTAINS BM/8351!")
            bm_found = True
        else:
            # Show tokens with subject code patterns
            if any(code in text.upper() for code in ['EC8', 'MD8', 'MA8', 'HS8', 'GE8']):
                print(f"✅ Token #{token_count}: '{text}' (conf: {conf:.2f})")
            else:
                print(f"   Token #{token_count}: '{text}' (conf: {conf:.2f})")

print("\n" + "=" * 80)
print(f"📊 Total tokens: {token_count}")

if bm_found:
    print("✅ Found tokens containing 'BM' or '8351'")
else:
    print("❌ NO tokens found containing 'BM' or '8351'")
    print("\n💡 This means BM8351 is NOT being detected by the OCR engine")
    print("   Possible reasons:")
    print("   - Text quality too poor in that area")
    print("   - Text is in an unexpected format")
    print("   - OCR preprocessing is removing it")
