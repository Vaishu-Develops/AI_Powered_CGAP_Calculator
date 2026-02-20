import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'

from ocr_service_v2 import EnhancedOCRService

svc = EnhancedOCRService(debug=False)
img = os.path.join(os.path.dirname(__file__), 'test', 'portal5.png')

# Run raw OCR
raw_res, err = svc._run_ocr(img)
tokens = svc._extract_tokens(raw_res)
tokens.sort(key=lambda t: (t['y_center'], t['x_center']))

print(f"Total tokens: {len(tokens)}")
print(f"{'#':>3} {'y':>7} {'x':>7} {'conf':>5} text")
print("-" * 80)

code_re = re.compile(r'([A-Z]{2,4}\d{3,5})\b', re.IGNORECASE)
for i, t in enumerate(tokens):
    text = t['text']
    codes = code_re.findall(text.upper())
    marker = ""
    if codes:
        valid = [c for c in codes if svc._is_valid_code(c)]
        marker = f" << CODES: {valid}" if valid else f" << INVALID: {codes}"
    elif text.strip().upper() in ('B', 'O', 'A+', 'B+', 'U', 'RA', 'A', 'C', 'P', 'S', 'D', 'E', 'F', 'SA', 'AB', 'FE', 'NC', 'W'):
        marker = " << GRADE"
    print(f"{i:>3} {t['y_center']:>7.1f} {t['x_center']:>7.1f} {t['confidence']:>5.2f} {text}{marker}")
