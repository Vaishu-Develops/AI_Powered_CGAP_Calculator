"""Show exact positions of tokens around BM8351 to understand row grouping."""
import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'

from ocr_service_v2 import EnhancedOCRService

svc = EnhancedOCRService(debug=False)
img = os.path.join(os.path.dirname(__file__), 'test', '2017 Mark.webp')

# Run raw OCR
raw_res, err = svc._run_ocr(img)
tokens = svc._extract_tokens(raw_res)
tokens.sort(key=lambda t: (t['y_center'], t['x_center']))

print(f"Total tokens: {len(tokens)}")
print(f"\nAll tokens with positions (sorted by y, x):")
print(f"{'#':>3} {'text':>40} {'y_center':>10} {'x_center':>10} {'y_min':>8} {'y_max':>8}")
print("-" * 90)

bm_y = None
for i, t in enumerate(tokens):
    text = t['text']
    y = t['y_center']
    x = t['x_center']
    marker = ""
    if 'BM8351' in text.upper():
        marker = " <-- BM8351"
        bm_y = y
    elif re.match(r'^[A-Z]{2,4}\d{3,5}$', text.upper()):
        marker = " <-- CODE"
    elif text.strip().upper() in ('B', 'O', 'A+', 'B+', 'U', 'RA', 'A', 'C', 'P', 'S', 'D', 'E', 'F', 'SA', 'AB', 'FE', 'NC', 'W'):
        marker = " <-- GRADE"
    elif text.strip().upper() == 'PASS':
        marker = " <-- PASS"
    elif text.strip() in ('01', '02', '03', '04', '05', '06', '07', '08'):
        marker = " <-- SEM"
        
    print(f"{i:>3} {text:>40} {y:>10.1f} {x:>10.1f} {t['y_min']:>8.1f} {t['y_max']:>8.1f}{marker}")

# Find BM8351 and show y_band calc
if bm_y is not None:
    img_height = max(t['y_max'] for t in tokens) - min(t['y_min'] for t in tokens)
    y_band = max(12, min(30, img_height / 40))
    print(f"\nimg_height={img_height:.1f}, y_band={y_band:.1f}, y_band*3={y_band*3:.1f}")
    print(f"BM8351 y_center={bm_y:.1f}")
    print(f"Tokens within y_band*3 of BM8351 (y in [{bm_y - y_band*3:.1f}, {bm_y + y_band*3:.1f}]):")
    for i, t in enumerate(tokens):
        if abs(t['y_center'] - bm_y) <= y_band * 3:
            print(f"  #{i}: '{t['text']}' y={t['y_center']:.1f} x={t['x_center']:.1f}")
