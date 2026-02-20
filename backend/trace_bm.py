"""
Trace BM8351 through the entire extraction pipeline with print statements
"""
import sys
import re
from ocr_service_v2 import EnhancedOCRService

image_path = r"D:\CGPA Calculator\backend\test\2017 Mark.webp"

with open(image_path, 'rb') as f:
    image_bytes = f.read()

# Monkey-patch _extract_subjects to add BM tracing
original_extract = EnhancedOCRService._extract_subjects

def traced_extract(self, tokens, regulation):
    print(f"\n--- _extract_subjects called with {len(tokens)} tokens, reg={regulation}")
    
    # Check if BM8351 is in tokens
    for t in tokens:
        if 'BM' in t['text'].upper():
            print(f"  TOKEN HAS BM: '{t['text']}' at y={t['y_center']:.1f}, x={t['x_center']:.1f}")
    
    # Check _build_subject_rows
    is_r2013 = regulation in ('2013', '2008')
    valid_grades = self.GRADES_R2013 if is_r2013 else self.GRADES_R2017
    
    if tokens:
        img_height = max(t['y_max'] for t in tokens) - min(t['y_min'] for t in tokens)
        y_band = max(12, img_height * 0.018)
    else:
        y_band = 20
    
    print(f"  y_band = {y_band:.1f}, is_r2013={is_r2013}")
    
    rows = self._build_subject_rows(tokens, y_band)
    
    print(f"  Built {len(rows)} subject rows")
    for i, row in enumerate(rows):
        row_texts = [t['text'] for t in row]
        row_upper = ' '.join(t.upper() for t in row_texts)
        codes = [c for c in self.SUBJECT_CODE_RE.findall(row_upper)
                 if self._is_valid_code(c) and c not in self.CODE_BLACKLIST]
        
        if any('BM' in c for c in codes):
            print(f"\n  *** BM ROW #{i}: texts = {row_texts}")
            print(f"      codes = {codes}")
            
            # Check grade merging
            merged = self._merge_grade_tokens(row_texts)
            filtered = [g for g in merged if g in valid_grades]
            print(f"      merged_grades = {merged}")
            print(f"      filtered_grades (valid for {regulation}) = {filtered}")
            
            # Check individual token normalization
            print(f"      individual token analysis:")
            for t in row_texts:
                norm = self._normalize_single_token(t.strip())
                is_valid = norm in valid_grades if norm else False
                print(f"        '{t}' -> normalize='{norm}' valid={is_valid}")
    
    # Now call original
    result = original_extract(self, tokens, regulation)
    
    # Check result for BM
    bm_in_result = any('BM' in s.get('subject_code', '') for s in result)
    print(f"\n  BM8351 in extract result: {bm_in_result}")
    print(f"  Total subjects from _extract_subjects: {len(result)}")
    
    return result

EnhancedOCRService._extract_subjects = traced_extract

# Run
svc = EnhancedOCRService(debug=False)
result, error = svc.process_marksheet(image_bytes)

if error:
    print(f"ERROR: {error}")
    sys.exit(1)

print(f"\nFINAL RESULT: {len(result.get('subjects', []))} subjects")
for s in result.get('subjects', []):
    code = s.get('subject_code', '?')
    grade = s.get('grade', '?')
    marker = " <-- BM!" if 'BM' in code else ""
    print(f"  {code}: {grade}{marker}")
