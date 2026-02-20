"""
7-Layer OCR Pipeline v3 for Anna University Marksheet Processing

Architecture:
Layer 1: Image Preprocessing (8 steps)
Layer 2: Text Detection (bounding boxes)
Layer 3: Text Recognition (with confidence)
Layer 4: Row Grouping (intelligent line detection)
Layer 5: Subject Row Parsing (fragment merging)
Layer 6: Semester Detection (metadata extraction)
Layer 7: Post-Processing & Validation

Author: OCR Service v3
Version: 3.2.0
Date: February 10, 2026
"""

from paddleocr import PaddleOCR
import cv2
import os
import re
import json
import logging
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass, asdict, field
import numpy as np
from concurrent.futures import ThreadPoolExecutor

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('OCR-V3')
import time


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class TextBox:
    """Bounding box from text detection"""
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    center_y: int
    center_x: int


@dataclass
class TextToken:
    """Recognized text with position and confidence"""
    text: str
    confidence: float  # 0.0-1.0
    bbox: Tuple[int, int, int, int]
    center_y: int
    center_x: int


@dataclass
class SubjectRow:
    """Grouped row of tokens representing one subject line"""
    tokens: List[TextToken]
    row_index: int
    y_position: int
    raw_img: Optional[np.ndarray] = None # For ROI recovery


@dataclass
class SubjectData:
    """Parsed subject information"""
    subject_code: str
    grade: str
    marks: Optional[int] = None
    credits: float = 3.0
    confidence: float = 0.0
    row_index: int = 0
    fragments_merged: bool = False
    is_revaluation: bool = False
    # Internal fields for parallel processing
    code_raw: str = ""
    grade_col_x: int = -1
    row_ref: Optional[SubjectRow] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class SemesterInfo:
    """Semester and student metadata"""
    semester: Optional[int] = None
    regulation: Optional[str] = None  # R2017, R2021, R2025
    branch: Optional[str] = None  # CSE, IT, ECE
    student_name: Optional[str] = None
    register_number: Optional[str] = None
    institution: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class LayerConfidence:
    """Confidence scores for each layer"""
    preprocessing: float = 0.0
    text_detection: float = 0.0
    text_recognition: float = 0.0
    row_grouping: float = 0.0
    subject_parsing: float = 0.0
    semester_detection: float = 0.0
    validation: float = 0.0
    overall: float = 0.0
    rating: str = ""
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class ProcessingMetadata:
    """Processing statistics"""
    total_rows_detected: int = 0
    fragments_merged: int = 0
    duplicates_removed: int = 0
    credits_filled_from_curriculum: int = 0
    processing_time_ms: int = 0
    
    def to_dict(self) -> Dict:
        return asdict(self)


# ============================================================================
# 7-LAYER OCR PIPELINE
# ============================================================================

class SevenLayerOCRService:
    """
    Production-grade 7-layer OCR pipeline for marksheet processing
    """
    
    # Valid grades for Anna University
    VALID_GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'RA', 'U', 'W', 'AB', 'SA', 'S']
    
    # Pattern definitions - allow 2-3 letters and 3-5 digits
    SUBJECT_PATTERN = r'([A-Z]{2,3}\s?\d{3,5}[A-Z]?)'
    GRADE_PATTERN = r'\b(O|A\+|A|B\+|B|C|P|RA|U|W|AB|SA|S)\b'
    MARKS_PATTERN = r'\b(\d{1,3})\b'
    
    # Student info patterns
    REGISTER_PATTERN = r'\b(\d{12})\b'
    SEMESTER_PATTERNS = [
        r'SEMESTER\s*[:-]?\s*(\d{1,2})',
        r'SEM\s*[:-]?\s*(\d{1,2})',
        r'(?<![A-Z])S\s*[:-]?\s*(\d{1,2})(?!\d)', # Avoid matching subject codes like CS6303
        r'(I|II|III|IV|V|VI|VII|VIII)\s*SEMESTER'
    ]
    NAME_PATTERN = r'(?:NAME|STUDENT)\s*[:-]?\s*([A-Z\s]{3,50})'
    
    # Regulation patterns
    REGULATION_PATTERNS = [
        r'R\s*2025', r'R\s*2021', r'R\s*2017', r'R\s*2013',
        r'REGULATION\s*2025', r'REGULATION\s*2021', r'REGULATION\s*2017', r'REGULATION\s*2013'
    ]
    
    # Branch names
    BRANCH_NAMES = [
        'COMPUTER SCIENCE', 'INFORMATION TECHNOLOGY', 'ELECTRONICS AND COMMUNICATION',
        'ELECTRICAL AND ELECTRONICS', 'MECHANICAL', 'CIVIL', 'AERONAUTICAL',
        'BIOMEDICAL', 'BIO MEDICAL', 'MEDICAL ELECTRONICS', 'MECHATRONICS', 'ROBOTICS',
        'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AERO', 'AUTO',
        'BME', 'BIOTECH', 'CHEM', 'ICE', 'PROD'
    ]
    
    def __init__(self, curriculum_service=None, debug=False):
        self.curriculum_service = curriculum_service
        self.debug = debug
        if debug: logger.setLevel(logging.DEBUG)
        self.ocr = None
        logger.info("7-Layer OCR Service v3 initialized")
    
    def _ensure_initialized(self):
        if self.ocr is None:
            try:
                logger.info("Initializing PaddleOCR engine...")
                from paddleocr import PaddleOCR
                self.ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
                logger.info("PaddleOCR engine ready!")
            except Exception as e:
                logger.error(f"Failed to initialize PaddleOCR: {e}")
                self.ocr = None
    
    # ------------------------------------------------------------------------
    # LAYER 1: IMAGE PREPROCESSING
    # ------------------------------------------------------------------------
    
    def layer1_preprocess(self, image: np.ndarray) -> Optional[np.ndarray]:
        try:
            logger.debug("  LAYER 1: Image Preprocessing")
            if image is None: return None
            
            # Step 1: Grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Step 2: Resize
            h, w = gray.shape
            max_d = 2000
            if max(h, w) > max_d:
                s = max_d / max(h, w)
                gray = cv2.resize(gray, (int(w*s), int(h*s)), interpolation=cv2.INTER_AREA)
            
            # Step 3: CLAHE
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Step 4: Sharpening
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            enhanced = cv2.filter2D(enhanced, -1, kernel)
            
            # Step 6: Adaptive thresholding
            thresh = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 13, 3)
            
            # Step 8: Deskewing
            deskewed = self._deskew_image(thresh)
            
            return deskewed
        except Exception as e:
            logger.error(f"Layer 1 error: {e}")
            return None
    
    def _deskew_image(self, image: np.ndarray) -> np.ndarray:
        try:
            edges = cv2.Canny(image, 50, 150, apertureSize=3)
            lines = cv2.HoughLines(edges, 1, np.pi / 180, 100)
            if lines is not None and len(lines) > 0:
                angles = []
                for line in lines[:10]:
                    rho, theta = line[0]
                    angle = np.degrees(theta) - 90
                    if -45 < angle < 45: angles.append(angle)
                if angles:
                    med = np.median(angles)
                    if abs(med) > 0.5:
                        h, w = image.shape
                        M = cv2.getRotationMatrix2D((w//2, h//2), med, 1.0)
                        return cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            return image
        except: return image

    # ------------------------------------------------------------------------
    # LAYER 3: TEXT RECOGNITION
    # ------------------------------------------------------------------------
    
    def layer3_recognize_text(self, image: np.ndarray) -> List[TextToken]:
        try:
            result = self.ocr.ocr(image, cls=True)
            if not result or not result[0]: return []
            tokens = []
            for line in result[0]:
                pts, (txt, conf) = line
                xs, ys = [p[0] for p in pts], [p[1] for p in pts]
                x1, x2, y1, y2 = int(min(xs)), int(max(xs)), int(min(ys)), int(max(ys))
                tokens.append(TextToken(text=txt.strip(), confidence=conf, bbox=(x1, y1, x2, y2), center_y=(y1+y2)//2, center_x=(x1+x2)//2))
            return tokens
        except Exception as e:
            logger.error(f"Layer 3 error: {e}")
            return []

    def _merge_token_sets(self, primary: List[TextToken], secondary: List[TextToken]) -> List[TextToken]:
        if not secondary: return primary
        if not primary: return secondary
        merged = list(primary)
        codes = {t.text.upper().replace(' ', '') for t in primary if re.match(r'^[A-Z]{2,}\d{3,}[A-Z]*$', t.text.upper().replace(' ', ''))}
        for tok in secondary:
            clean = tok.text.upper().replace(' ', '')
            if re.match(r'^[A-Z]{2,}\d{3,}[A-Z]*$', clean):
                is_dup = False
                for ec in codes:
                    if len(clean) == len(ec) and sum(1 for a, b in zip(clean, ec) if a != b) <= 1:
                        is_dup = True
                        break
                if not is_dup:
                    merged.append(tok)
                    codes.add(clean)
        return merged

    # ------------------------------------------------------------------------
    # LAYER 4: ROW GROUPING
    # ------------------------------------------------------------------------
    
    def layer4_group_rows(self, tokens: List[TextToken], raw_img: Optional[np.ndarray] = None) -> List[SubjectRow]:
        try:
            anchors = []
            sub_re = re.compile(r'^[A-Z]{2,}\d{3,}[A-Z]*$')
            for t in tokens:
                clean_text = t.text.upper().replace(' ', '')
                # Normalize common misreads in subject codes (e.g. O instead of 0 in numbers)
                if len(clean_text) >= 6:
                    normalized = clean_text[:2] + clean_text[2:].replace('O', '0').replace('I', '1').replace('S', '5')
                    if sub_re.match(normalized):
                        t.text = normalized # Update token text for downstream
                        anchors.append(t)
                elif sub_re.match(clean_text): 
                    anchors.append(t)
            
            # Integrated Layout-Agnostic Table Detection if anchors are low
            if len(anchors) < 3 and raw_img is not None:
                logger.info("Low anchor count. Attempting layout-agnostic table detection...")
                found_ys = self._detect_table_structure_fallback(raw_img)
                if found_ys:
                    # Supplement existing anchors or replace if none
                    logger.info(f"Detected {len(found_ys)} potential rows from table structure.")
                    # TODO: Merge logic if needed, for now just use them if no anchors
                    if not anchors:
                        return self._group_by_fixed_ys(tokens, found_ys, raw_img)

            if not anchors: return self._fallback_grouping(tokens, raw_img)
            
            # Anchor-based assignment
            rows = [[] for _ in anchors]
            a_ys = [a.center_y for a in anchors]
            a_ids = {id(a) for a in anchors}
            for i, a in enumerate(anchors): rows[i].append(a)
            for t in tokens:
                if id(t) in a_ids: continue
                best, b_dist = None, 12
                for i, ay in enumerate(a_ys):
                    d = abs(t.center_y - ay)
                    if d < b_dist: b_dist, best = d, i
                if best is not None: rows[best].append(t)
            
            # Filter out headers from subject rows
            header_terms = {'SEMESTER', 'SUBJECT', 'CODE', 'GRADE', 'RESULT', 'BRANCH'}
            
            s_rows = []
            for i, r in enumerate(rows):
                # Only keep rows that look like subject rows (have a code or digits for semester)
                txt = ' '.join([t.text.upper() for t in r])
                if any(term in txt for term in header_terms) and not any(re.match(r'^[A-Z]{2,}\d{3,}', t.text.upper().replace(' ', '')) for t in r):
                    logger.debug(f"Skipping header row candidate: {txt}")
                    continue
                    
                r.sort(key=lambda x: x.center_x)
                s_rows.append(SubjectRow(tokens=r, row_index=len(s_rows), y_position=a_ys[i], raw_img=raw_img))
            s_rows.sort(key=lambda x: x.y_position)
            for i, r in enumerate(s_rows): r.row_index = i
            return s_rows
        except Exception as e:
            logger.error(f"Layer 4 error: {e}")
            return []

    def _fallback_grouping(self, tokens: List[TextToken], raw_img: Optional[np.ndarray] = None) -> List[SubjectRow]:
        sorted_tokens = sorted(tokens, key=lambda t: t.center_y)
        rows, current_row = [], []
        if not sorted_tokens: return []
        cy = sorted_tokens[0].center_y
        for t in sorted_tokens:
            if abs(t.center_y - cy) <= 15: current_row.append(t)
            else:
                current_row.sort(key=lambda x: x.center_x)
                rows.append(SubjectRow(tokens=current_row, row_index=len(rows), y_position=cy, raw_img=raw_img))
                current_row, cy = [t], t.center_y
        if current_row:
            current_row.sort(key=lambda x: x.center_x)
            rows.append(SubjectRow(tokens=current_row, row_index=len(rows), y_position=cy, raw_img=raw_img))
        return rows

    def _detect_table_structure_fallback(self, image: np.ndarray) -> List[int]:
        """Detect horizontal lines to identify potential row positions"""
        try:
            if len(image.shape) == 3: gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else: gray = image
            
            # Adaptive threshold for better line detection
            thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            
            # Detect horizontal lines
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (image.shape[1] // 40, 1))
            detected_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
            cnts = cv2.findContours(detected_lines, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cnts = cnts[0] if len(cnts) == 2 else cnts[1]
            
            ys = []
            for c in cnts:
                x, y, w_c, h_c = cv2.boundingRect(c)
                if w_c > image.shape[1] * 0.3: # Line spans at least 30% of width
                    ys.append(y + h_c // 2)
            
            return sorted(list(set(ys))) if ys else []
        except: return []

    def _group_by_fixed_ys(self, tokens: List[TextToken], ys: List[int], raw_img: Optional[np.ndarray]) -> List[SubjectRow]:
        rows = [[] for _ in ys]
        for t in tokens:
            best, b_dist = None, 30
            for i, y in enumerate(ys):
                d = abs(t.center_y - y)
                if d < b_dist: b_dist, best = d, i
            if best is not None: rows[best].append(t)
        
        s_rows = []
        for i, r in enumerate(rows):
            if not r: continue
            r.sort(key=lambda x: x.center_x)
            s_rows.append(SubjectRow(tokens=r, row_index=len(s_rows), y_position=ys[i], raw_img=raw_img))
        return s_rows
    # ------------------------------------------------------------------------
    # LAYER 5: SUBJECT ROW PARSING & RECOVERY
    # ------------------------------------------------------------------------
    
    def layer5_parse_rows(self, rows: List[SubjectRow]) -> List[SubjectData]:
        try:
            logger.debug("  LAYER 5: Parsing & Recovery")
            subjects = []
            
            # 1. Identify Grade/Result column bounds if headers exist
            grade_col_x = -1
            for r in rows:
                for t in r.tokens:
                    if 'GRADE' in t.text.upper(): grade_col_x = t.center_x
            
            for r in rows:
                txt = ' '.join([t.text.upper() for t in r.tokens])
                m = re.search(self.SUBJECT_PATTERN, txt)
                if not m: continue
                code_raw = m.group(1).replace(' ', '')
                # Clean prefix noise (e.g. CBM333 -> BM333 if C is noise)
                code = self._clean_subject_code(code_raw)
                
                # Only look for grades in tokens AFTER the subject code 
                # AND ideally in the Grade column
                subject_tokens = [t for t in r.tokens if code_raw in t.text.upper().replace(' ', '')]
                if not subject_tokens: continue
                last_subject_x = max(t.bbox[2] for t in subject_tokens)
                
                candidate_tokens = [t for t in r.tokens if t.center_x > last_subject_x - 5]
                # If we know the Grade column, prioritize it
                if grade_col_x > 0:
                    strict_candidates = [t for t in candidate_tokens if abs(t.center_x - grade_col_x) < 50]
                    if strict_candidates: candidate_tokens = strict_candidates

                grade, merged = self._merge_grade_fragments(candidate_tokens)
                subjects.append(SubjectData(subject_code=code, grade=grade, marks=self._extract_marks(candidate_tokens), credits=3.0, confidence=0.0, row_index=r.row_index, fragments_merged=merged, is_revaluation='REVALUATION' in txt or r.y_position > 450, code_raw=code_raw, grade_col_x=grade_col_x, row_ref=r))
            
            # ROI RECOVERY (Sequential for thread safety with PaddleOCR)
            to_recover = [s for s in subjects if not s.grade or s.grade not in self.VALID_GRADES]
            if to_recover:
                logger.info(f"Recovering {len(to_recover)} subject grades via ROI...")
                for s in to_recover:
                    try:
                        g, m = self._recover_grade_from_roi(s.row_ref, s.code_raw, s.grade_col_x)
                        if g in self.VALID_GRADES:
                            s.grade, s.fragments_merged = g, m
                            s.confidence = 0.8 # Boost confidence for recovery
                    except Exception as e:
                        logger.error(f"ROI Recovery Error for {s.code_raw}: {e}")

            # Filter out invalid ones completely
            final_subs = [s for s in subjects if s.grade in self.VALID_GRADES]
            for s in final_subs: s.confidence = 0.9 if s.marks else (s.confidence or 0.8)
            
            return final_subs
        except Exception as e:
            logger.error(f"Layer 5 error: {e}")
            return []

    def _recover_grade_from_roi(self, row: SubjectRow, subject_code: str = "", expected_x: int = -1) -> Tuple[Optional[str], bool]:
        if row.raw_img is None or not row.tokens: return None, False
        try:
            # 1. Define ROI
            sub_tokens = [t for t in row.tokens if subject_code in t.text.upper().replace(' ', '')]
            anchor_x = sub_tokens[0].bbox[2] if sub_tokens else min(t.bbox[0] for t in row.tokens)
            
            y_min = min(t.bbox[1] for t in row.tokens)
            y_max = max(t.bbox[3] for t in row.tokens)
            
            h, w = row.raw_img.shape[:2]
            y_pad = 10 # Increased padding
            x_pad = 20
            roi = row.raw_img[max(0, y_min-y_pad):min(h, y_max+y_pad), max(0, anchor_x-x_pad):w]
            
            # Ensure ROI is not too small (helps PaddleOCR stability)
            if roi.shape[0] < 20 or roi.shape[1] < 20:
                roi = cv2.copyMakeBorder(roi, 10, 10, 10, 10, cv2.BORDER_REPLICATE)
            
            # 2. Local OCR with sharpening
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            roi_zoom = cv2.resize(gray, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_LANCZOS4)
            # Sharpen
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            roi_sharp = cv2.filter2D(roi_zoom, -1, kernel)
            _, thresh = cv2.threshold(roi_sharp, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # 3. Text Recognition on ROI
            tokens = self.layer3_recognize_text(cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR))
            
            # Scale coordinates back to original ROI space for spatial filtering
            grade_candidates = []
            if self.debug: print(f"      ROI tokens for {subject_code}:")
            for t in tokens:
                if self.debug: print(f"        - {t.text} (conf: {t.confidence:.2f}, x: {t.center_x})")
                # Balanced threshold for ROI zoom
                if t.confidence < 0.5: continue 
                clean = t.text.upper().strip()
                if len(clean) > 3: continue 
                if any(x in clean for x in ["PASS", "FAIL", "CONT", "ABS", "RESULT", "S-", "C-"]): continue
                
                # Check spatial alignment if expected_x is known
                if expected_x > 0:
                    real_x = anchor_x - 10 + (t.center_x / 3.0)
                    if abs(real_x - expected_x) > 60: continue
                
                grade_candidates.append(t)
                
            return self._merge_grade_fragments(grade_candidates)
        except: return None, False

    def _clean_subject_code(self, code: str) -> str:
        """Minimal cleaning of common OCR noise in digits"""
        # Normalize O->0, I->1, etc. in the numeric part specifically
        if len(code) >= 4:
            # Find where letters end and numbers begin
            match = re.search(r'([A-Z]+)(\d.*)', code)
            if match:
                prefix, rest = match.groups()
                rest = rest.replace('O', '0').replace('I', '1').replace('S', '5').replace('Z', '2').replace('B', '8')
                return prefix + rest
        return code
    def _merge_grade_fragments(self, tokens: List[TextToken]) -> Tuple[Optional[str], bool]:
        trans = {'0': 'O', 'o': 'O', '6': 'G', 'l': 'I', '1': 'I', '5': 'S', '8': 'B'}
        texts = []
        for t in tokens:
            v = t.text.upper().strip()
            # If multiple chars in a token, check if it's a grade
            if v in self.VALID_GRADES: return v, False
            # Check single char translations
            v_clean = trans.get(v, v)
            if v_clean in self.VALID_GRADES: return v_clean, False
            texts.append(v_clean)
        
        # Merge fragments
        for i in range(len(texts)-1):
            if texts[i] in ['A', 'B'] and texts[i+1] == '+': return texts[i]+'+', True
            if texts[i] == 'R' and texts[i+1] == 'A': return 'RA', True
            if texts[i] == 'A' and texts[i+1] == 'B': return 'AB', True
            if texts[i] == 'S' and texts[i+1] == 'A': return 'SA', True
        return None, False

    def _extract_marks(self, tokens: List[TextToken]) -> Optional[int]:
        for t in tokens:
            ms = re.findall(r'\b(\d{1,3})\b', t.text)
            for v in ms:
                iv = int(v)
                if 0 <= iv <= 100: return iv
        return None

    # ------------------------------------------------------------------------
    # LAYER 6: SEMESTER DETECTION
    # ------------------------------------------------------------------------
    
    def layer6_detect_semester(self, tokens: List[TextToken]) -> SemesterInfo:
        try:
            info = SemesterInfo()
            txt = ' '.join([t.text.upper() for t in tokens])
            for p in self.SEMESTER_PATTERNS:
                m = re.search(p, txt)
                if m:
                    s = m.group(1)
                    info.semester = {'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,'VIII':8}.get(s, int(s) if s.isdigit() else None)
                    break
            for p in self.REGULATION_PATTERNS:
                m = re.search(p, txt)
                if m:
                    yr = re.search(r'20\d{2}', m.group(0))
                    if yr: info.regulation = f"R{yr.group(0)}"
                    break
            for b in self.BRANCH_NAMES:
                if b in txt:
                    # Map full names to abbreviations
                    mapping = {
                        'COMPUTER SCIENCE': 'CSE', 'INFORMATION TECHNOLOGY': 'IT',
                        'ELECTRONICS AND COMMUNICATION': 'ECE', 'ELECTRICAL AND ELECTRONICS': 'EEE',
                        'MECHANICAL': 'MECH', 'BIOMEDICAL': 'BME', 'BIO MEDICAL': 'BME',
                        'MEDICAL ELECTRONICS': 'MDE', 'MECHATRONICS': 'MCT'
                    }
                    info.branch = mapping.get(b, b)
                    break
            reg = re.search(self.REGISTER_PATTERN, txt)
            if reg: info.register_number = reg.group(1)
            name = re.search(self.NAME_PATTERN, txt)
            if name: info.student_name = name.group(1).strip()
            if 'ANNA' in txt and 'UNIVERSITY' in txt: info.institution = "Anna University"
            return info
        except: return SemesterInfo()

    # ------------------------------------------------------------------------
    # LAYER 7: VALIDATION
    # ------------------------------------------------------------------------
    
    def layer7_validate(self, subjects: List[SubjectData], info: SemesterInfo) -> Tuple[List[SubjectData], ProcessingMetadata]:
        meta = ProcessingMetadata()
        
        # 1. Deduplication (Prefix/Suffix overlap handling)
        if subjects:
            sorted_subs = sorted(subjects, key=lambda x: len(x.subject_code), reverse=True)
            final_subs = []
            for s in sorted_subs:
                is_dup = False
                for existing in final_subs:
                    if abs(s.row_index - existing.row_index) <= 1:
                        if s.subject_code in existing.subject_code or existing.subject_code in s.subject_code:
                            is_dup = True
                            break
                if not is_dup: final_subs.append(s)
                else: meta.duplicates_removed += 1
            subjects = final_subs

        # 2. Curriculum Cross-Referencing & Self-Correction
        if self.curriculum_service:
            b, r = info.branch or "CSE", (info.regulation or "2021").replace('R','')
            for s in subjects:
                try:
                    # SELF-CORRECTION: Try to match subject code with curriculum for small OCR shifts
                    # e.g. CS63O3 -> CS6303
                    corrected_code = s.subject_code
                    if not self.curriculum_service.get_credits(corrected_code, branch=b, regulation=r).credits > 0:
                        # Try fuzzy match or known misreads
                        alternatives = [
                            s.subject_code.replace('O', '0'),
                            s.subject_code.replace('I', '1'),
                            s.subject_code.replace('S', '5')
                        ]
                        
                        # Add prefix-stripped alternatives (e.g. TME6611 -> ME6611, OEE351 -> EE351)
                        if len(s.subject_code) >= 6 and s.subject_code[0] in ['T', 'O', 'C', '0', 'Q']:
                            alternatives.append(s.subject_code[1:])
                            
                        for alt in alternatives:
                            if alt != corrected_code and self.curriculum_service.get_credits(alt, branch=b, regulation=r).credits > 0:
                                logger.info(f"Self-Corrected: {s.subject_code} -> {alt}")
                                corrected_code = alt
                                break
                    
                    s.subject_code = corrected_code
                    cr = self.curriculum_service.get_credits(s.subject_code, branch=b, regulation=r)
                    if cr.credits > 0:
                        s.credits = cr.credits
                        meta.credits_filled_from_curriculum += 1
                except: pass
        
        if not subjects: return [], meta

        # 3. Final Re-resolve (Revaluation priority)
        seen = {}
        for s in subjects:
            if s.subject_code not in seen: seen[s.subject_code] = s
            else:
                ex = seen[s.subject_code]
                if s.is_revaluation and not ex.is_revaluation: seen[s.subject_code] = s
                elif not ex.is_revaluation and s.confidence > ex.confidence: 
                    seen[s.subject_code] = s
                    meta.duplicates_removed += 1
        
        res = sorted(list(seen.values()), key=lambda x: x.subject_code)
        meta.fragments_merged = sum(1 for s in res if s.fragments_merged)
        logger.info(f"Validation complete: Extracted {len(res)} subjects | {meta.duplicates_removed} dups removed")
        return res, meta

    # ------------------------------------------------------------------------
    # MAIN PIPELINE
    # ------------------------------------------------------------------------
    
    def process_marksheet(self, bytes_data: bytes) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            start = time.time()
            self._ensure_initialized()
            if not self.ocr: return None, "Engine initialization failed"
            
            raw_img = cv2.imdecode(np.frombuffer(bytes_data, np.uint8), cv2.IMREAD_COLOR)
            if raw_img is None: return None, "Could not decode image"
            
            # Pass 1: Global Preprocessing
            prep = self.layer1_preprocess(raw_img)
            t1 = self.layer3_recognize_text(prep) if prep is not None else []
            
            # Pass 2: Raw OCR
            t2 = self.layer3_recognize_text(raw_img)
            
            # Pass 3: Alt Preprocessing (Contrast Only)
            gray = cv2.cvtColor(raw_img, cv2.COLOR_BGR2GRAY)
            _, th = cv2.threshold(cv2.GaussianBlur(gray, (5,5), 0), 0, 255, cv2.THRESH_BINARY+cv2.THRESH_OTSU)
            t3 = self.layer3_recognize_text(cv2.cvtColor(th, cv2.COLOR_GRAY2BGR))
            
            # Merge Tokens
            tokens = self._merge_token_sets(t2, t1)
            tokens = self._merge_token_sets(tokens, t3)
            
            if not tokens: return None, "No text detected"
            
            # 4. Group Rows
            rows = self.layer4_group_rows(tokens, raw_img=raw_img)
            if not rows: return None, "No rows detected"
            
            # 5. Parse subjects (includes ROI recovery)
            subs = self.layer5_parse_rows(rows)
            if not subs: return None, "No subjects parsed"
            
            # 6. Detection Semester
            info = self.layer6_detect_semester(tokens)
            
            # 7. Validate
            v_subs, meta = self.layer7_validate(subs, info)
            
            meta.processing_time_ms = int((time.time()-start)*1000)
            meta.total_rows_detected = len(rows)
            
            res = {
                'subjects': [s.to_dict() for s in v_subs],
                'semester_info': info.to_dict(),
                'processing_info': meta.to_dict()
            }
            return res, None
        except Exception as e:
            return None, str(e)

    def extract_grades_from_result(self, result: Dict) -> List[Dict]:
        if not result or 'subjects' not in result: return []
        # Add is_arrear flag if original_semester != current_semester
        current_sem = result.get('semester_info', {}).get('semester')
        grades = []
        for s in result['subjects']:
            grade_entry = {
                'subject': s['subject_code'],
                'grade': s['grade'],
                'credits': s.get('credits', 3.0),
                'marks': s.get('marks'),
                'is_revaluation': s.get('is_revaluation', False)
            }
            # Try to determine if it's an arrear based on code pattern if possible
            # But mostly we'll rely on the calculator's internal logic or provided metadata
            grades.append(grade_entry)
        return grades
