"""
Enhanced OCR Service v2 for Anna University Marksheets

Extraction pipeline (per the user's spec):
1. Detect subject code → that anchors a new logical row.
2. Gather all OCR tokens belonging to that row (same y-band, until next code).
3. Grade detection:
   - Merge multi-token fragments: "A" + "+" → "A+"
   - Normalize to the valid grade set for the detected regulation.
4. Marks:
   - R2013 format has NO marks column → skip marks entirely.
   - R2017+ may have marks (≥ 40, 2–3 digits, right-aligned) → extract only those.
5. Credits:
   - NEVER read from marksheet. Always from curriculum JSON / pattern rules.

Grade points reference (handled by calculator.py, not here):
  R2017/R2021/R2025: O=10, A+=9, A=8, B+=7, B=6, C=5, RA/SA/W=0
  R2013:             S=10, A=9, B=8, C=7, D=6, E=5, U/RA=0
"""

from paddleocr import PaddleOCR
import cv2
import numpy as np
import os
import re
import logging
from typing import Dict, List, Optional, Tuple


class EnhancedOCRService:
    """
    Enhanced OCR Service for Anna University marksheet processing.

    Usage:
        service = EnhancedOCRService(debug=False)
        result, error = service.process_marksheet(image_bytes)
        grades = service.extract_grades_from_result(result)
    """

    # ── subject code pattern ──────────────────────────────────────────────
    # R2021/R2025: XX3xxx / XX1xxx  (CS3301, MA3151)
    # R2017:       XX8xxx          (CS8351, MA8151)
    # R2013:       XX2xxx / XX6xxx (CS2201, ME6601)
    # Also: CBM333, OEE351, NM1066, MX3089 etc (2-3 letter prefix + 3-4 digits)
    # Minimum total length: 5 chars (XX999) to avoid false positives
    SUBJECT_CODE_RE = re.compile(r'([A-Z]{2,4}\d{3,5})\b', re.IGNORECASE)

    # Words/tokens that should NOT be treated as subject codes
    CODE_BLACKLIST = {'PASS', 'FAIL', 'RESULT', 'ANNA', 'GRADE', 'SHEET'}

    @staticmethod
    def _is_valid_code(code: str) -> bool:
        """Validate a candidate subject code.
        Anna University codes: 2-4 letter prefix + 3-5 digit number (5-8 chars total)
        Examples: CS3301, NM1066, MX3089, CBM333, OEE351
        Reject codes that are too short, too long, or in the blacklist."""
        if len(code) < 5 or len(code) > 8:
            return False
            
        # Must have at least 2 letters at start  
        letters = 0
        for ch in code:
            if ch.isalpha():
                letters += 1
            else:
                break
        if letters < 2:
            return False
            
        # Digit portion must be at least 3
        digits = len(code) - letters
        if digits < 3:
            return False
            
        # Blacklist check
        if code.upper() in {'PASS', 'FAIL', 'RESULT', 'ANNA', 'GRADE', 'SHEET', 'CLASS', 'TOTAL', 'POINT'}:
            return False
            
        return True

    @staticmethod
    def _normalize_code(code: str) -> str:
        """Normalize OCR artifacts like leading T/L/P before a valid code."""
        code = code.strip().upper()
        if len(code) >= 6 and code[0] in ('T', 'L', 'P'):
            candidate = code[1:]
            if EnhancedOCRService._is_valid_code(candidate):
                return candidate
        return code

    # ── regulation-specific valid grade sets ──────────────────────────────
    GRADES_R2013   = {'S', 'A', 'B', 'C', 'D', 'E', 'RA', 'U', 'F', 'W', 'SA', 'AB'}
    GRADES_R2017   = {'O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'RA', 'U', 'F', 'W', 'SA', 'AB', 'FE'}
    ALL_GRADES     = GRADES_R2013 | GRADES_R2017          # union for initial matching

    # ── semester / register / regulation detection ────────────────────────
    SEMESTER_PATTERNS = [
        re.compile(r'(?:semester|sem)[\s:.\-]*(\d)', re.I),
        re.compile(r'(\d)(?:st|nd|rd|th)\s*sem', re.I),
        re.compile(r'SEM[\s\-]*([1-8])', re.I),
    ]
    REGISTER_PATTERNS = [
        re.compile(r'\b(\d{3}[A-Z]\d{7,8})\b'),
        re.compile(r'\b(\d{12})\b'),
        re.compile(r'(?:Reg|Register)[\s.No:]*(\d+)', re.I),
    ]
    REGULATION_PATTERNS = [
        re.compile(r'(?:regulation|reg)[\s:.\-]*(20\d{2})', re.I),
        re.compile(r'R\s*(20\d{2})', re.I),
    ]

    # ── OCR misread corrections for + grades ──────────────────────────────
    PLUS_FIXES = {
        'AT': 'A+', 'A+': 'A+', 'A T': 'A+',
        'BT': 'B+', 'B+': 'B+', 'B T': 'B+',
    }

    # ──────────────────────────────────────────────────────────────────────

    def __init__(self, lang: str = 'en', debug: bool = False):
        self.lang = lang
        self.debug = debug
        self.engine = None
        self._initialized = False

        self.logger = logging.getLogger('EnhancedOCR')
        if debug:
            logging.basicConfig(level=logging.DEBUG)
        else:
            logging.basicConfig(level=logging.INFO)

    # ── lazy PaddleOCR init ───────────────────────────────────────────────

    def _ensure_initialized(self):
        if not self._initialized:
            try:
                self.logger.info("Initializing PaddleOCR engine...")
                self.engine = PaddleOCR(
                    use_angle_cls=True,
                    lang=self.lang,
                    show_log=False,
                )
                self._initialized = True
                self.logger.info("PaddleOCR engine initialized successfully!")
            except Exception as e:
                self.logger.error(f"Failed to initialize PaddleOCR: {e}")
                self.engine = None
                self._initialized = True

    # ── image preprocessing ───────────────────────────────────────────────

    def _preprocess_image(self, img: np.ndarray) -> np.ndarray:
        """Enhanced image preprocessing with 7-layer inspired improvements."""
        if img is None:
            return img

        h, w = img.shape[:2]

        # Upscale small images
        if w < 1000:
            scale = 1500 / w
            img = cv2.resize(img, None, fx=scale, fy=scale,
                             interpolation=cv2.INTER_CUBIC)

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img.copy()
        
        # Step 1: CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Step 2: Bilateral filtering (edge-preserving noise reduction)
        bilateral = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # Step 3: Gaussian blur (slight noise reduction)
        blurred = cv2.GaussianBlur(bilateral, (3, 3), 0)
        
        # Step 4: Adaptive thresholding (better than global threshold)
        adaptive = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                        cv2.THRESH_BINARY, 11, 2)
        
        # Step 5: Morphological operations (remove small noise)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        cleaned = cv2.morphologyEx(adaptive, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        
        # Step 6: Optional deskewing (for rotated images)
        # TODO: Add rotation detection and correction if needed
        
        return cleaned
        denoised = cv2.fastNlMeansDenoising(enhanced, h=10,
                                             templateWindowSize=7,
                                             searchWindowSize=21)
        return cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)

    # ── run OCR ───────────────────────────────────────────────────────────

    def _run_ocr(self, img: np.ndarray) -> Tuple[Optional[list], Optional[str]]:
        self._ensure_initialized()
        if not self.engine:
            return None, "OCR Engine not initialized"
        try:
            return self.engine.ocr(img), None
        except Exception as e:
            return None, str(e)

    # ── extract positioned tokens ─────────────────────────────────────────

    def _extract_tokens(self, ocr_result) -> List[Dict]:
        """Return list of {text, confidence, y_center, x_center, y_min, ...}
        sorted top→bottom."""
        tokens: List[Dict] = []
        if not ocr_result or not ocr_result[0]:
            return tokens

        for item in ocr_result[0]:
            if not item or len(item) < 2:
                continue
            bbox = item[0]
            text = item[1][0].strip()
            conf = item[1][1]
            if not text:
                continue

            y_center = sum(p[1] for p in bbox) / 4
            x_center = sum(p[0] for p in bbox) / 4
            tokens.append({
                'text': text,
                'confidence': conf,
                'y_center': y_center,
                'x_center': x_center,
                'y_min': min(p[1] for p in bbox),
                'y_max': max(p[1] for p in bbox),
                'x_min': min(p[0] for p in bbox),
                'x_max': max(p[0] for p in bbox),
                'bbox': bbox,
            })

        tokens.sort(key=lambda t: (t['y_center'], t['x_center']))
        return tokens

    # ── detect regulation ─────────────────────────────────────────────────

    def _detect_regulation(self, full_text: str) -> str:
        """Return '2013', '2017', '2021', or '2025'."""
        for pat in self.REGULATION_PATTERNS:
            m = pat.search(full_text)
            if m:
                return m.group(1)

        # Infer from first subject code
        m = self.SUBJECT_CODE_RE.search(full_text.upper())
        if m:
            c3 = m.group(1)[2] if len(m.group(1)) > 2 else '3'
            if c3 == '8':
                return '2017'
            if c3 in ('2', '6'):
                return '2013'
        return '2021'

    # ── student info ──────────────────────────────────────────────────────

    def _extract_student_info(self, full_text: str) -> Dict:
        info: Dict = {}

        # Semester
        for pat in self.SEMESTER_PATTERNS:
            m = pat.search(full_text)
            if m:
                try:
                    s = int(m.group(1))
                    if 1 <= s <= 8:
                        info['semester'] = s
                        break
                except (ValueError, IndexError):
                    pass

        # Register number
        for pat in self.REGISTER_PATTERNS:
            m = pat.search(full_text)
            if m:
                info['register_number'] = m.group(1)
                break

        # Regulation (already detected elsewhere, but also store here)
        info['regulation'] = self._detect_regulation(full_text)

        # Name
        m = re.search(r'(?:name|student)[\s:.\-]+([A-Z][A-Z\s.]{2,})', full_text, re.I)
        if m:
            info['name'] = m.group(1).strip()

        return info

    # ── grade normalisation (multi-token aware) ───────────────────────────

    def _normalize_single_token(self, tok: str) -> Optional[str]:
        """Try to match a single OCR token to a valid grade.
        Also handles '0' (zero) being OCR'd as 'O' (letter O grade)."""
        tok = tok.strip().upper()
        if tok in self.ALL_GRADES:
            return tok
        if tok in self.PLUS_FIXES:
            return self.PLUS_FIXES[tok]
        
        # Enhanced OCR corrections
        corrections = {
            '0': 'O',   # Zero to Outstanding  
            'o': 'O',   # lowercase o
            'a': 'A',   # lowercase a
            'b': 'B',   # lowercase b  
            'c': 'C',   # lowercase c
            '6': 'G',   # 6 looks like G sometimes
            'I': 'I',   # keep I as is
            'l': 'I',   # lowercase l vs I
            '1': 'I'    # number 1 vs letter I
        }
        
        if tok in corrections:
            return corrections[tok] if corrections[tok] in self.ALL_GRADES else None
            
        return None

    def _merge_grade_tokens(self, tokens: List[str]) -> List[str]:
        """
        Walk a list of raw token strings and merge grade fragments:
          ["A", "+"] → ["A+"]
          ["B", "+"] → ["B+"]
          ["O"]      → ["O"]
        Returns only the valid grade tokens found (in order).
        """
        grades: List[str] = []
        i = 0
        while i < len(tokens):
            tok = tokens[i].strip().upper()

            # Try combining with next token first  (A + + → A+)
            if i + 1 < len(tokens):
                next_tok = tokens[i + 1].strip().upper()
                combined = tok + next_tok          # "A" + "+" → "A+"
                norm = self._normalize_single_token(combined)
                if norm and norm in ('A+', 'B+'):
                    grades.append(norm)
                    i += 2
                    continue

            # Single-token grade
            norm = self._normalize_single_token(tok)
            if norm:
                # Guard: reject if the raw token (before .upper()) is clearly
                # part of a longer word. If the raw token length is 1 or 2
                # it's almost certainly a standalone grade cell in the marksheet.
                # Also explicitly reject common words that contain grades.
                raw_token = tokens[i].strip()
                if raw_token.upper() in ('PASS', 'FAIL', 'RESULT', 'CLASS', 'STUDENT'):
                    i += 1
                    continue
                if len(raw_token) <= 2 or norm in ('A+', 'B+', 'RA', 'AB', 'SA', 'FE'):
                    grades.append(norm)

            i += 1
        return grades

    # ── subject-code-anchored row building ────────────────────────────────

    def _build_subject_rows(self, tokens: List[Dict],
                             y_band: float = 20.0) -> List[List[Dict]]:
        """
        Build logical rows anchored by subject codes.

        Two-phase algorithm (handles grade tokens that sort before their
        subject code due to sub-pixel y differences):
          Phase 1 – Identify all subject-code anchor tokens and their y.
          Phase 2 – Assign every remaining token to the nearest anchor
                    whose y_center is within ± y_band * 2.
        """
        # Phase 1: find anchor tokens (those containing valid subject codes)
        anchors: List[Dict] = []  # {token, y_center, index}
        for i, tok in enumerate(tokens):
            text_upper = tok['text'].upper()
            found_codes = self.SUBJECT_CODE_RE.findall(text_upper)
            valid_codes = []
            for c in found_codes:
                nc = self._normalize_code(c)
                if self._is_valid_code(nc):
                    valid_codes.append(nc)
            if valid_codes:
                anchors.append({'token': tok, 'y': tok['y_center'], 'idx': i})

        if not anchors:
            return []

        # Phase 2: build rows – each anchor starts a row, then collect
        # nearby non-anchor tokens by closest y-distance
        rows: List[List[Dict]] = [[] for _ in anchors]
        anchor_ys = [a['y'] for a in anchors]
        anchor_indices = {a['idx'] for a in anchors}

        # Place each anchor token first in its row
        for ri, a in enumerate(anchors):
            rows[ri].append(a['token'])

        # Assign non-anchor tokens to closest anchor row
        max_dist = y_band * 2
        for i, tok in enumerate(tokens):
            if i in anchor_indices:
                continue  # already placed
            ty = tok['y_center']
            best_ri = None
            best_dist = max_dist + 1
            for ri, ay in enumerate(anchor_ys):
                d = abs(ty - ay)
                if d < best_dist:
                    best_dist = d
                    best_ri = ri
            if best_ri is not None and best_dist <= max_dist:
                rows[best_ri].append(tok)

        # Sort tokens within each row by x_center (left→right)
        for row in rows:
            row.sort(key=lambda t: t['x_center'])

        # Remove empty rows (shouldn't happen but be safe)
        return [r for r in rows if r]

    # ── extract subjects ──────────────────────────────────────────────────

    def _extract_subjects(self, tokens: List[Dict],
                           regulation: str) -> List[Dict]:
        """
        Main extraction pipeline:
        1. Build subject-code-anchored rows from OCR tokens.
        2. For each row, merge grade fragments → single grade.
        3. Marks: only for R2017+ and only if a number ≥ 40 is present.
        4. Never extract credits from the marksheet.
        """
        is_r2013 = regulation in ('2013', '2008')
        valid_grades = self.GRADES_R2013 if is_r2013 else self.GRADES_R2017

        # Dynamic y_band from image extent
        if tokens:
            img_height = max(t['y_max'] for t in tokens) - min(t['y_min'] for t in tokens)
            y_band = max(12, img_height * 0.018)
        else:
            y_band = 20

        rows = self._build_subject_rows(tokens, y_band)

        subjects: List[Dict] = []

        for row in rows:
            # Sort row left → right for consistent reading order
            row.sort(key=lambda t: t['x_center'])

            row_tokens_text = [t['text'] for t in row]
            row_text_upper = ' '.join(t.upper() for t in row_tokens_text)

            # 1. Find subject code(s) in this row (with validation)
            codes = []
            for c in self.SUBJECT_CODE_RE.findall(row_text_upper):
                nc = self._normalize_code(c)
                if self._is_valid_code(nc) and nc not in self.CODE_BLACKLIST:
                    codes.append(nc)
            if not codes:
                continue

            # 2. Merge grade fragments from the individual tokens
            merged_grades = self._merge_grade_tokens(row_tokens_text)
            # Filter to regulation-valid grades only
            merged_grades = [g for g in merged_grades if g in valid_grades]

            # 3. Marks (only for R2017+, only numbers ≥ 40 and ≤ 100)
            marks_list: List[Optional[int]] = []
            if not is_r2013:
                for t in row_tokens_text:
                    for num_str in re.findall(r'\b(\d{2,3})\b', t):
                        val = int(num_str)
                        # Must not be part of a subject code
                        if 40 <= val <= 100 and not any(num_str in c for c in codes):
                            marks_list.append(val)

            # 4. Pair code → grade (allow duplicates for revaluation results)
            for ci, code in enumerate(codes):
                # Removed duplicate filtering to capture revaluation results
                # A subject may appear twice: original + revaluation

                # DEBUG: Log BM codes
                if 'BM' in code and self.debug:
                    self.logger.debug(f"  Processing {code}: merged_grades={merged_grades}, ci={ci}")

                grade = merged_grades[ci] if ci < len(merged_grades) else None

                # If no grade found via merge, try individual-token scan
                if grade is None:
                    for t in row_tokens_text:
                        g = self._normalize_single_token(t.strip())
                        if g and g in valid_grades:
                            grade = g
                            break

                # DEBUG: Log BM codes grade resolution
                if 'BM' in code and self.debug:
                    self.logger.debug(f"  {code} grade resolved to: {grade}")

                if grade is None:
                    if 'BM' in code and self.debug:
                        self.logger.debug(f"  SKIPPING {code} - no grade found")
                    continue  # cannot determine grade → skip this code

                marks = marks_list[ci] if ci < len(marks_list) else None

                subjects.append({
                    'subject_code': code,
                    'grade': grade,
                    'marks': marks,
                })

                if self.debug:
                    self.logger.debug(
                        f"  Extracted: {code} → {grade}"
                        + (f" (marks={marks})" if marks else "")
                    )

        # ── Fallback: ALWAYS also try sequential, pick best ─────────
        fallback = self._fallback_sequential(tokens, valid_grades)
        if len(fallback) > len(subjects):
            subjects = fallback

        return subjects

    def _fallback_sequential(self, tokens: List[Dict],
                              valid_grades: set) -> List[Dict]:
        """
        Walk all tokens sequentially. Each time a subject code appears,
        look ahead (up to 10 tokens) for the next valid grade.
        """
        # Pre-merge A/B + "+" at token level
        raw = [t['text'].strip().upper() for t in tokens]
        merged: List[str] = []
        i = 0
        while i < len(raw):
            if i + 1 < len(raw) and raw[i] in ('A', 'B') and raw[i + 1] == '+':
                merged.append(raw[i] + '+')
                i += 2
            else:
                merged.append(raw[i])
                i += 1

        # Locate codes (allow duplicates for revaluation results)
        code_positions: List[Tuple[str, int]] = []
        for idx, tok in enumerate(merged):
            m = self.SUBJECT_CODE_RE.match(tok)
            if m:
                code = self._normalize_code(m.group(1))
                if self._is_valid_code(code):
                    # Keep all occurrences, even duplicates (for revaluation)
                    code_positions.append((code, idx))

        code_indices = {idx for _, idx in code_positions}

        if self.debug:
            self.logger.debug(f"Fallback: found {len(code_positions)} code positions:")
            for code, idx in code_positions:
                self.logger.debug(f"  [{idx}] {code}")

        subjects: List[Dict] = []
        for code, idx in code_positions:
            grade = None
            for j in range(idx + 1, min(idx + 10, len(merged))):
                if j in code_indices:
                    break
                g = self._normalize_single_token(merged[j])
                if g and g in valid_grades:
                    grade = g
                    if 'BM' in code and self.debug:
                        self.logger.debug(f"  Fallback: {code} found grade '{g}' at position {j}")
                    break
            
            if grade:
                if 'BM' in code and self.debug:
                    self.logger.debug(f"  Fallback: Adding {code} = {grade}")
                subjects.append({
                    'subject_code': code,
                    'grade': grade,
                    'marks': None,
                })
            elif 'BM' in code and self.debug:
                self.logger.debug(f"  Fallback: SKIPPING {code} - no grade found in next 10 tokens")

        if self.debug:
            self.logger.debug(f"Fallback sequential: {len(subjects)} found")
        return subjects

    # ── confidence scoring ────────────────────────────────────────────────

    def _calculate_confidence(self, all_tokens: List[Dict],
                               subjects: List[Dict],
                               student_info: Dict) -> Dict:
        ocr_conf = (sum(t['confidence'] for t in all_tokens) / len(all_tokens)
                     if all_tokens else 0.0)

        n = len(subjects)
        extraction_conf = min(1.0, n / 8) if n >= 6 else (0.7 if n >= 3 else (0.5 if n >= 1 else 0.1))

        info_fields = ('semester', 'register_number', 'regulation')
        found = sum(1 for f in info_fields if f in student_info)
        parsing_conf = 0.5 + (found / len(info_fields)) * 0.5

        overall = ocr_conf * 0.4 + extraction_conf * 0.4 + parsing_conf * 0.2

        return {
            'overall': round(overall, 3),
            'ocr': round(ocr_conf, 3),
            'extraction': round(extraction_conf, 3),
            'parsing': round(parsing_conf, 3),
            'subjects_found': n,
        }

    # ── main entry point ──────────────────────────────────────────────────

    def process_marksheet(self, image_bytes: bytes) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Process a marksheet image end-to-end.

        Returns (result_dict, error_string).
        result_dict keys:
          subjects      – [{subject_code, grade, marks?}]
          student_info  – {name?, register_number?, semester?, regulation}
          confidence    – {overall, ocr, extraction, parsing, subjects_found}
          raw_text      – full OCR text
        """
        try:
            # 1. Decode
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return None, "Could not decode image"

            # 2. Preprocess
            preprocessed = self._preprocess_image(img)

            # 3. OCR on both original & preprocessed → merge results
            raw_res, err = self._run_ocr(img)
            if err:
                return None, err
            prep_res, _ = self._run_ocr(preprocessed)

            raw_n  = len(raw_res[0])  if raw_res  and raw_res[0]  else 0
            prep_n = len(prep_res[0]) if prep_res and prep_res[0] else 0

            # Use the pass with more tokens as primary
            primary_res = prep_res if prep_n > raw_n else raw_res
            secondary_res = raw_res if prep_n > raw_n else prep_res

            if not primary_res or not primary_res[0]:
                return None, "No text detected in image"

            # 4. Extract tokens from primary pass
            all_tokens = self._extract_tokens(primary_res)

            # 5. Merge unique subject-code tokens from secondary pass
            #    to recover subjects that preprocessing might have destroyed.
            #    Skip codes that are fuzzy-duplicates of primary codes (OCR misreads).
            if secondary_res and secondary_res[0]:
                secondary_tokens = self._extract_tokens(secondary_res)
                # Find subject codes in primary
                primary_codes = set()
                for t in all_tokens:
                    for m in self.SUBJECT_CODE_RE.findall(t['text'].upper()):
                        nm = self._normalize_code(m)
                        if self._is_valid_code(nm):
                            primary_codes.add(nm)

                def _is_fuzzy_dup(code: str, existing: set) -> bool:
                    """True if code differs from any existing by ≤ 1 char."""
                    for ec in existing:
                        if len(code) == len(ec):
                            diffs = sum(1 for a, b in zip(code, ec) if a != b)
                            if diffs <= 1:
                                return True
                    return False

                # Add any genuinely missing subject-code tokens from secondary
                for st in secondary_tokens:
                    sec_codes = []
                    for m in self.SUBJECT_CODE_RE.findall(st['text'].upper()):
                        nm = self._normalize_code(m)
                        if self._is_valid_code(nm):
                            sec_codes.append(nm)
                    for sc in sec_codes:
                        if sc not in primary_codes and not _is_fuzzy_dup(sc, primary_codes):
                            all_tokens.append(st)
                            primary_codes.add(sc)
                            if self.debug:
                                self.logger.debug(
                                    f"  Merged missing subject from secondary: "
                                    f"'{st['text']}' (code: {sc})"
                                )
                            # Also grab nearby grade/result tokens from secondary
                            for st2 in secondary_tokens:
                                if st2 is not st and abs(st2['y_center'] - st['y_center']) <= 15:
                                    if not any(self._is_valid_code(m) 
                                            for m in self.SUBJECT_CODE_RE.findall(st2['text'].upper())):
                                        all_tokens.append(st2)

                # Re-sort after merging
                all_tokens.sort(key=lambda t: (t['y_center'], t['x_center']))

            full_text = '\n'.join(t['text'] for t in all_tokens)

            # 5. Detect regulation
            regulation = self._detect_regulation(full_text)

            # 6. Student info
            student_info = self._extract_student_info(full_text)

            # 7. Extract subjects (code-anchored, multi-token grade merge)
            subjects = self._extract_subjects(all_tokens, regulation)

            # 8. Confidence
            confidence = self._calculate_confidence(all_tokens, subjects, student_info)

            self.logger.info(
                f"Extracted {len(subjects)} subjects (reg={regulation}), "
                f"confidence={confidence['overall']:.2f}"
            )

            return {
                'subjects': subjects,
                'student_info': student_info,
                'confidence': confidence,
                'raw_text': full_text,
            }, None

        except Exception as e:
            self.logger.error(f"Error processing marksheet: {e}")
            import traceback
            traceback.print_exc()
            return None, str(e)

    # ── adapter for main.py ───────────────────────────────────────────────

    def extract_grades_from_result(self, result: Dict) -> List[Dict]:
        """
        Convert process_marksheet() output into the list-of-dicts format
        that main.py expects.

        Returns:
          [{subject, grade, marks, original_semester}, ...]
        """
        if not result or 'subjects' not in result:
            return []

        grades_list: List[Dict] = []
        for subj in result['subjects']:
            code  = subj.get('subject_code', '')
            grade = subj.get('grade', '')
            if not code or not grade:
                continue

            # Infer semester from 4th digit of subject code
            original_semester = None
            if len(code) >= 4:
                try:
                    d = int(code[3])
                    if 1 <= d <= 8:
                        original_semester = d
                except ValueError:
                    pass

            grades_list.append({
                'subject': code,
                'grade': grade,
                'marks': subj.get('marks'),
                'original_semester': original_semester,
            })

        return grades_list
