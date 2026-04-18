"""
 Saffron OCR Pipeline v3 for Anna University Marksheet Processing

Architecture:
Advanced multi-stage processing including:
Image Preprocessing, Text Detection, Text Recognition,
Row Grouping, Fragment Merging, Semester Detection,
and Post-Processing Validation.

Author: Saffron Engine v3
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
    overridden_by_revaluation: bool = False
    main_grade: str = ""
    revaluation_grade: str = ""
    original_semester: Optional[int] = None
    review_required: bool = False
    # Production validation fields
    validation_status: str = ""  # "verified" | "corrected" | "unverified"
    original_code: str = ""      # Original OCR code before auto-correction
    original_grade: str = ""     # Original grade before correction
    # Internal fields for parallel processing
    code_raw: str = ""
    grade_col_x: int = -1
    row_ref: Optional[SubjectRow] = None
    
    def to_dict(self) -> Dict:
        d = {
            'subject_code': self.subject_code,
            'grade': self.grade,
            'marks': self.marks,
            'credits': self.credits,
            'confidence': self.confidence,
            'is_revaluation': self.is_revaluation,
            'overridden_by_revaluation': self.overridden_by_revaluation,
            'validation_status': self.validation_status,
        }
        if self.main_grade:
            d['main_grade'] = self.main_grade
        if self.revaluation_grade:
            d['revaluation_grade'] = self.revaluation_grade
        if self.original_semester is not None:
            d['original_semester'] = self.original_semester
        if self.review_required:
            d['review_required'] = True
        if self.original_code:
            d['original_code'] = self.original_code
        if self.original_grade:
            d['original_grade'] = self.original_grade
        return d


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
    # Production validation stats
    codes_verified: int = 0        # Matched curriculum exactly
    codes_auto_corrected: int = 0  # Fixed via fuzzy matching
    codes_unverified: int = 0      # No curriculum match
    grades_corrected: int = 0      # Grade value auto-fixed
    processing_time_ms: int = 0
    confidence_rating: str = ""    # HIGH / MEDIUM / LOW
    corrections: List[Dict] = field(default_factory=list)  # Correction audit log
    
    def to_dict(self) -> Dict:
        return asdict(self)


# ============================================================================
# SAFFRON OCR PIPELINE
# ============================================================================

class SaffronOCRService:
    """
    Production-grade OCR pipeline for marksheet processing
    """
    
    # Valid grades for Anna University
    VALID_GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'RA', 'U', 'W', 'AB', 'SA', 'S']
    
    # Pattern definitions - allow digits in prefix for OCR error handling (e.g. B -> 8)
    SUBJECT_PATTERN = r'([A-Z0-9]{2,3}\s?\d{3,5}[A-Z]?)'
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
    
    # Branch names - ordered longer first for priority matching
    BRANCH_NAMES = [
        'COMPUTER SCIENCE AND ENGINEERING', 'COMPUTER SCIENCE',
        'INFORMATION TECHNOLOGY', 'ELECTRONICS AND COMMUNICATION',
        'ELECTRICAL AND ELECTRONICS', 'MECHANICAL', 'CIVIL', 'AERONAUTICAL',
        'BIOMEDICAL', 'BIO MEDICAL', 'MEDICAL ELECTRONICS', 'MECHATRONICS', 'ROBOTICS',
    ]
    
    def __init__(self, curriculum_service=None, debug=False):
        self.curriculum_service = curriculum_service
        self.debug = debug
        if debug: logger.setLevel(logging.DEBUG)
        self.ocr = None
        logger.info("Saffron OCR Service v3 initialized")
    
    def _ensure_initialized(self):
        if self.ocr is None:
            try:
                from paddleocr import PaddleOCR
                # Use only core arguments to avoid Unknown Argument crashes
                self.ocr = PaddleOCR(use_angle_cls=True, lang='en')
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
            
            # Step 4: Gentle unsharp mask (preserves thin strokes like '+' in A+/B+)
            blurred = cv2.GaussianBlur(enhanced, (0, 0), 3)
            enhanced = cv2.addWeighted(enhanced, 1.5, blurred, -0.5, 0)
            enhanced = np.clip(enhanced, 0, 255).astype(np.uint8)
            
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
        """Merge tokens from multiple OCR passes. Keep ALL useful tokens, not just codes."""
        if not secondary: return primary
        if not primary: return secondary
        merged = list(primary)
        
        # Build spatial index of existing tokens for dedup
        existing_positions = []
        for t in primary:
            existing_positions.append((t.center_y, t.center_x, t.text.upper().strip()))
        
        for tok in secondary:
            clean = tok.text.upper().strip()
            
            # Skip empty tokens
            if not clean: continue
            
            # Check if a similar token already exists at this position
            is_dup = False
            dup_idx = -1
            for idx, (ey, ex, etxt) in enumerate(existing_positions):
                if abs(tok.center_y - ey) < 10 and abs(tok.center_x - ex) < 25:
                    is_dup = True
                    dup_idx = idx
                    break
            
            if not is_dup:
                merged.append(tok)
                existing_positions.append((tok.center_y, tok.center_x, clean))
            else:
                # FIX 2: Keep the higher-confidence reading instead of always keeping primary
                existing_tok = merged[dup_idx] if dup_idx < len(merged) else None
                if existing_tok is not None and tok.confidence > existing_tok.confidence:
                    merged[dup_idx] = tok
                    existing_positions[dup_idx] = (tok.center_y, tok.center_x, clean)
        
        return merged

    # ------------------------------------------------------------------------
    # LAYER 4: ROW GROUPING
    # ------------------------------------------------------------------------
    
    def layer4_group_rows(self, tokens: List[TextToken], raw_img: Optional[np.ndarray] = None) -> List[SubjectRow]:
        try:
            anchors = []
            sub_re = re.compile(self.SUBJECT_PATTERN.replace('(', '^').replace(')', '$'))
            for t in tokens:
                txt = t.text.upper().replace(' ', '')
                # Anchor 1: Semester digits (01-08)
                m_sem = re.match(r'^(0[1-8]|[1-8])$', txt)
                # Anchor 2: Subject code pattern
                m_sub = re.match(self.SUBJECT_PATTERN, txt)
                # Anchor 3: Section headers
                is_section = any(kw in txt for kw in ['REVALUAT', 'PHOTOCOPY', 'REVAL'])
                
                if m_sem or m_sub or is_section:
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
            
            # FIX 3a: More generous radius for first-pass assignment (25px instead of 20px)
            unclaimed = []
            for t in tokens:
                if id(t) in a_ids: continue
                best, b_dist = None, 25  # Increased from 20 to 25
                for i, ay in enumerate(a_ys):
                    d = abs(t.center_y - ay)
                    if d < b_dist: b_dist, best = d, i
                if best is not None:
                    rows[best].append(t)
                else:
                    unclaimed.append(t)
            
            # FIX 3b: More aggressive second-pass sweep — assign orphaned tokens at up to 40px
            for t in unclaimed:
                best, b_dist = None, 40  # Increased from 30 to 40
                for i, ay in enumerate(a_ys):
                    d = abs(t.center_y - ay)
                    if d < b_dist: b_dist, best = d, i
                if best is not None:
                    rows[best].append(t)
                    logger.debug(f"Second-pass claimed orphan token '{t.text}' → row {best} (dist={b_dist}px)")
            
            # FIX 3c: Third-pass for heavily fragmented subjects - look for any remaining subject-like tokens
            remaining_unclaimed = []
            for t in tokens:
                if any(id(t) in [id(rt) for rt in r] for r in rows):
                    continue  # Already assigned
                # Check if this looks like a important token (subject code fragment or grade)
                txt = t.text.upper().replace(' ', '')
                if (re.search(r'[A-Z]{2,3}\d{2,4}', txt) or  # Subject code pattern
                    txt in self.VALID_GRADES or  # Valid grade
                    len(txt) >= 3):  # Significant text
                    remaining_unclaimed.append(t)
            
            # Assign remaining tokens to nearest row (up to 50px away)
            for t in remaining_unclaimed:
                best, b_dist = None, 50
                for i, ay in enumerate(a_ys):
                    d = abs(t.center_y - ay)
                    if d < b_dist: b_dist, best = d, i
                if best is not None:
                    rows[best].append(t)
                    logger.debug(f"Third-pass claimed important token '{t.text}' → row {best} (dist={b_dist}px)")
            
            # Filter out headers from subject rows
            header_terms = {'SEMESTER', 'SUBJECT', 'CODE', 'GRADE', 'RESULT', 'BRANCH'}
            
            s_rows = []
            for i, r in enumerate(rows):
                # Only keep rows that look like subject rows OR section headers
                txt = ' '.join([t.text.upper() for t in r])
                
                # Section keywords that SHOULD NOT be filtered out (for stateful context)
                section_keywords = {'REVALUAT', 'PHOTOCOPY', 'REVAL'}
                has_section_key = any(kw in txt for kw in section_keywords)
                
                # Use the same relaxed pattern (without capturing group) for header exclusion check
                check_pattern = self.SUBJECT_PATTERN.replace('(', '').replace(')', '')
                has_subject = any(re.search(check_pattern, t.text.upper().replace(' ', '')) for t in r)
                
                if any(term in txt for term in header_terms) and not has_subject and not has_section_key:
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
            
            # 1. Identify Grade column X position from header row (multiple variants)
            header_grade_col_x = -1
            result_col_x = -1
            GRADE_HEADER_VARIANTS = {'GRADE', 'GR ADE', 'GR.', 'GR', 'GRADES'}
            for r in rows:
                for t in r.tokens:
                    tu = t.text.upper().strip().rstrip(':')
                    if tu in GRADE_HEADER_VARIANTS:
                        header_grade_col_x = t.center_x
                    if tu in {'RESULT', 'RESULTS', 'STATUS'}:
                        result_col_x = t.center_x
            
            # 2. ALWAYS compute median estimate from confirmed grade tokens (as fallback/union)
            median_grade_col_x = -1
            grade_xs = []
            for r in rows:
                for t in r.tokens:
                    v = t.text.upper().strip()
                    if v in self.VALID_GRADES or v in ['0', 'o']:
                        grade_xs.append(t.center_x)
            if grade_xs:
                median_grade_col_x = int(np.median(grade_xs))

            # Union: use header X if detected, else median; keep both for union search
            grade_col_x = header_grade_col_x if header_grade_col_x > 0 else median_grade_col_x
            # Build a set of candidate X anchors for grade search
            grade_col_anchors = [x for x in [header_grade_col_x, median_grade_col_x] if x > 0]
            
            # OCR confusion map for grades
            GRADE_CHAR_MAP = {'0': 'O', 'o': 'O', '6': 'G', 'l': 'I', '1': 'I', '5': 'S', '8': 'B'}
            
            in_reval_section = False
            for r in rows:
                txt = ' '.join([t.text.upper() for t in r.tokens])
                
                # Detect special section headers that flag subsequent rows
                # e.g. "Revaluation / Photocopy Result"
                
                # First try exact pattern match
                m = re.search(self.SUBJECT_PATTERN, txt)
                
                # If no exact match, try more lenient patterns for missing subjects
                code_raw = None
                if m:
                    code_raw = m.group(1).replace(' ', '')
                else:
                    # Fallback: look for any letter+digit combinations that could be subjects
                    # This catches subjects that might be split or have OCR errors
                    fallback_patterns = [
                        r'([A-Z]{2,3}\s*\d{3,4}[A-Z]?)',  # Standard pattern with optional spaces
                        r'([A-Z]{2}\s*\d{4})',  # 4-digit codes like GE3251 
                        r'([A-Z]{3}\s*\d{3})',  # 3-letter + 3-digit codes
                        r'([A-Z]{2}\s*\d{3}[A-Z]?)',  # 2-letter + 3-digit + optional suffix
                    ]
                    
                    for pattern in fallback_patterns:
                        m_fallback = re.search(pattern, txt)
                        if m_fallback:
                            code_raw = m_fallback.group(1).replace(' ', '')
                            logger.debug(f"Fallback pattern matched: '{code_raw}' in '{txt}'")
                            break
                
                # Skip if no subject pattern found at all
                if not code_raw:
                    if any(kw in txt for kw in ['REVALUAT', 'PHOTOCOPY', 'REVAL']):
                        in_reval_section = True
                        logger.debug(f"  [Layer 5] Entered revaluation section at row {r.row_index}")
                    continue
                
                code = self._clean_subject_code(code_raw)
                
                # More lenient validation for subject codes
                # Anna University codes are usually at least 5-6 chars, but be more forgiving
                if len(code) < 5: 
                    logger.debug(f"  Skipping short code: '{code}' (length {len(code)})")
                    continue
                
                # Must contain at least one letter (AU codes always have a prefix)
                if not any(c.isalpha() for c in code): 
                    logger.debug(f"  Skipping non-alphabetic code: '{code}'")
                    continue
                
                # Additional validation: check if it looks like a reasonable Anna University code
                # Most AU codes follow: 2-3 letters + 3-4 digits + optional suffix
                if not re.match(r'^[A-Z]{2,3}\d{3,4}[A-Z]?$', code):
                    logger.debug(f"  Code format validation failed: '{code}'")
                    continue
                
                # FIX 3c: Fault-tolerant subject code token boundary detection
                # Primary: exact match of code_raw in a single token
                subject_tokens = [t for t in r.tokens if code_raw in t.text.upper().replace(' ', '')]
                if not subject_tokens:
                    # Fallback: find the rightmost token whose text is a prefix OR suffix of code_raw
                    # (handles OCR splitting a code like 'CS3551' into 'CS35'+'51')
                    best_frag, best_frag_len = None, 0
                    for t in r.tokens:
                        txt = t.text.upper().replace(' ', '')
                        if len(txt) >= 3 and (code_raw.startswith(txt) or code_raw.endswith(txt)):
                            if len(txt) > best_frag_len:
                                best_frag, best_frag_len = t, len(txt)
                    if best_frag:
                        subject_tokens = [best_frag]
                        logger.debug(f"Subject token fallback: '{best_frag.text}' for code '{code_raw}'")
                    else:
                        continue
                code_right_x = max(t.bbox[2] for t in subject_tokens)
                
                # Determine if this row is explicitly a revaluation row
                is_reval = in_reval_section or 'REVALUAT' in txt or 'REVAL' in txt
                
                # Strategy 1: Look for grade in grade column area (union search across all anchors)
                grade = None
                merged = False
                
                if grade_col_anchors:
                    # Union search — a token is accepted if within 90px of ANY anchor X
                    # (covers both header-detected and median-estimated grade column positions)
                    seen_tids = set()
                    grade_area_tokens = []
                    for anchor_x in grade_col_anchors:
                        for t in r.tokens:
                            if id(t) in seen_tids: continue
                            if (t.center_x > code_right_x - 10
                                    and abs(t.center_x - anchor_x) < 90
                                    and (result_col_x < 0 or t.center_x < result_col_x - 20)):
                                grade_area_tokens.append(t)
                                seen_tids.add(id(t))
                    if grade_area_tokens:
                        grade, merged = self._merge_grade_fragments(grade_area_tokens, is_reval)

                
                # Strategy 2: If no grade found, look at ALL tokens after the code
                if not grade or grade not in self.VALID_GRADES:
                    candidate_tokens = [
                        t for t in r.tokens 
                        if t.center_x > code_right_x - 5
                    ]
                    grade, merged = self._merge_grade_fragments(candidate_tokens, is_reval)
                
                # Strategy 3: Try to find grade/result pattern in the raw text after code
                if not grade or grade not in self.VALID_GRADES:
                    # Look for grade pattern in text after subject code
                    after_code = txt[txt.find(code_raw) + len(code_raw):]
                    gm = re.search(self.GRADE_PATTERN, after_code)
                    if gm:
                        grade = gm.group(1)
                        merged = False
                    else:
                        # Check for '0' or 'o' which should be grade 'O'
                        for t in r.tokens:
                            if t.center_x > code_right_x and t.text.strip() in ['0', 'o', 'O']:
                                grade = 'O'
                                break
                
                # Detect result status (PASS/RA)
                result_status = None
                if 'PASS' in txt: result_status = 'PASS'
                elif 'RA' in txt: result_status = 'RA'
                
                # Detect if UA grade (absent) - in Anna University result
                if not grade or grade not in self.VALID_GRADES:
                    for t in r.tokens:
                        ut = t.text.upper().strip()
                        if ut == 'UA':
                            grade = 'U'  # UA means absent = U grade
                            break

                # Extract row semester from the row text (e.g. leading 06/05/04 column)
                row_semester = None
                sem_candidates = re.findall(r'\b(0?[1-8])\b', txt)
                if sem_candidates:
                    try:
                        row_semester = int(sem_candidates[0])
                    except Exception:
                        row_semester = None

                subjects.append(SubjectData(
                    subject_code=code, grade=grade, 
                    marks=self._extract_marks([t for t in r.tokens if t.center_x > code_right_x]),
                    credits=3.0, confidence=0.0, row_index=r.row_index, 
                    fragments_merged=merged, 
                    is_revaluation=is_reval,
                    original_semester=row_semester,
                    code_raw=code_raw, grade_col_x=grade_col_x, row_ref=r
                ))
            
            # ROI RECOVERY for subjects still missing grades
            to_recover = [s for s in subjects if not s.grade or s.grade not in self.VALID_GRADES]
            if to_recover:
                logger.info(f"Recovering {len(to_recover)} subject grades via ROI...")
                for s in to_recover:
                    try:
                        g, m = self._recover_grade_from_roi(s.row_ref, s.code_raw, s.grade_col_x)
                        if g and g in self.VALID_GRADES:
                            s.grade, s.fragments_merged = g, m
                            s.confidence = 0.8
                    except Exception as e:
                        logger.error(f"ROI Recovery Error for {s.code_raw}: {e}")

            # Filter out invalid ones
            final_subs = [s for s in subjects if s.grade and s.grade in self.VALID_GRADES]
            for s in final_subs: s.confidence = 0.9 if s.marks else (s.confidence or 0.8)
            
            return final_subs
        except Exception as e:
            logger.error(f"Layer 5 error: {e}")
            return []

    def _recover_grade_from_roi(self, row: SubjectRow, subject_code: str = "", expected_x: int = -1) -> Tuple[Optional[str], bool]:
        """ROI-based grade recovery: zoom into the grade column area and re-OCR."""
        if row.raw_img is None or not row.tokens: return None, False
        try:
            # 1. Define ROI boundaries from row tokens
            sub_tokens = [t for t in row.tokens if subject_code in t.text.upper().replace(' ', '')]
            anchor_x = sub_tokens[0].bbox[2] if sub_tokens else min(t.bbox[0] for t in row.tokens)
            
            y_min = min(t.bbox[1] for t in row.tokens)
            y_max = max(t.bbox[3] for t in row.tokens)
            
            h, w = row.raw_img.shape[:2]
            y_pad = 12
            
            # If we know the grade column, focus the ROI on that area
            if expected_x > 0:
                roi_x_start = max(0, expected_x - 60)
                roi_x_end = min(w, expected_x + 60)
            else:
                # Use area after subject code
                roi_x_start = max(0, anchor_x - 10)
                roi_x_end = w
            
            roi = row.raw_img[max(0, y_min-y_pad):min(h, y_max+y_pad), roi_x_start:roi_x_end]
            
            # Ensure ROI is large enough for PaddleOCR
            if roi.shape[0] < 15 or roi.shape[1] < 15:
                roi = cv2.copyMakeBorder(roi, 15, 15, 15, 15, cv2.BORDER_REPLICATE)
            
            # 2. Multiple preprocessing attempts for ROI
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            
            # Attempt A: High contrast threshold
            roi_zoom = cv2.resize(gray, None, fx=3.0, fy=3.0, interpolation=cv2.INTER_LANCZOS4)
            _, thresh = cv2.threshold(roi_zoom, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            tokens_a = self.layer3_recognize_text(cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR))
            
            # Attempt B: Sharpened + adaptive threshold
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            roi_sharp = cv2.filter2D(roi_zoom, -1, kernel)
            thresh_b = cv2.adaptiveThreshold(roi_sharp, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            tokens_b = self.layer3_recognize_text(cv2.cvtColor(thresh_b, cv2.COLOR_GRAY2BGR))
            
            # Combine all tokens from both attempts
            all_roi_tokens = tokens_a + tokens_b
            
            if self.debug:
                print(f"      ROI tokens for {subject_code}:")
                for t in all_roi_tokens:
                    print(f"        - {t.text} (conf: {t.confidence:.2f}, x: {t.center_x})")
            
            # 3. Try to find grade from all ROI tokens
            grade_candidates = []
            for t in all_roi_tokens:
                if t.confidence < 0.4: continue 
                clean = t.text.upper().strip()
                if len(clean) > 4: continue 
                if any(x in clean for x in ["PASS", "FAIL", "CONT", "ABS", "RESULT"]): continue
                grade_candidates.append(t)
                
            return self._merge_grade_fragments(grade_candidates)
        except: return None, False

    def _clean_subject_code(self, code: str) -> str:
        """Enhanced cleaning of common OCR noise in subject codes.
        Anna University codes follow [PREFIX][DIGITS][SUFFIX]
        Example: BE3251, GE3152, HS3252
        Common OCR errors: B->8, S->5, 0->O
        """
        if len(code) < 4: return code
        
        # Safeguard: If the code is completely numeric, it's likely NOT a subject code
        # (could be a register number or phone number fragment).
        if code.isdigit():
            return code
            
        # 1. Fix prefix errors (Digits misread as Letters)
        # Typical prefixes: HS, MA, PH, GE, BE, CS, IT, EC, EE, ME, CE, AD, CB, MX, NM
        # Expanded map: covers all common OCR digit→letter confusions for prefix chars
        prefix_fix = {
            '8': 'B', '5': 'S', '0': 'O',
            '6': 'G',   # G→6 is very common (GE→6E, GE3251→6E3251)
            '1': 'I',   # I→1 (IT→1T)
            '7': 'T',   # T→7 (possible but rare)
            '2': 'Z',   # Z→2 (rare)
        }
        code_chars = list(code)
        
        # If the first character is a digit, it's likely a misread letter
        if code_chars[0].isdigit() and code_chars[0] in prefix_fix:
            code_chars[0] = prefix_fix[code_chars[0]]
        
        # If the second character is a digit and looks like a misread letter
        if len(code_chars) > 1 and code_chars[1].isdigit() and code_chars[1] in prefix_fix:
             # If we have [Letter][Digit], the Digit is likely a misread Letter (e.g. M8 -> ME, C5 -> CS)
             if code_chars[0].isalpha():
                 code_chars[1] = prefix_fix[code_chars[1]]
        
        code = "".join(code_chars)
        
        # 2. Fix numeric part errors (Letters misread as Digits)
        match = re.search(r'([A-Z]+)(\d.*)', code)
        if match:
            prefix, rest = match.groups()
            # Only replace obvious OCR errors in numeric part
            # Use a map for safety
            trans_inner = {'O': '0', 'I': '1', 'Z': '2', 'B': '8', 'S': '5', 'G': '6'}
            rest_fixed = "".join([trans_inner.get(c, c) for c in rest])
            return prefix + rest_fixed
            
        return code
    def _merge_grade_fragments(self, tokens: List[TextToken], is_revaluation: bool = False) -> Tuple[Optional[str], bool]:
        """Extract grade from a set of candidate tokens. Handles OCR confusions like 0→O.
        
        ORDER IS IMPORTANT:
        1. Compound fragment merge (A+, B+, RA, AB, SA) FIRST — so 'A' + '+' → 'A+' not 'A'
        2. Exact single-char grade match
        3. OCR confusion translation
        4. Regex fallback on full text
        """
        # OCR confusion map: digit/lowercase -> grade letter
        trans = {'0': 'O', 'o': 'O', '6': 'G', 'l': 'I', '1': 'I', '8': 'B', '5': 'S', '2': 'Z'}
        
        # Skip tokens that are clearly not grades
        SKIP_WORDS = {'PASS', 'FAIL', 'RESULT', 'GRADE', 'SEMESTER', 'CODE', 'SUBJECT'}
        
        clean_tokens = []
        for t in tokens:
            v = t.text.upper().strip()
            # Skip result status tokens and known non-grade words
            if any(sw in v for sw in SKIP_WORDS): continue
            # Skip semester numbers (2 digits like "01", "05")
            if re.match(r'^\d{2}$', v) and int(v) <= 10: continue
            # Skip subject codes (letters+digits pattern)
            if re.match(r'^[A-Z]{2,}\d{3,}', v): continue
            clean_tokens.append(t)
        
        # Sort tokens left-to-right so fragment order is deterministic
        clean_tokens.sort(key=lambda t: t.center_x)
        
        # Build normalised text list for compound checks
        texts = []
        for t in clean_tokens:
            v = t.text.upper().strip()
            v_clean = trans.get(t.text.strip(), v)
            texts.append(v_clean)
        
        # PASS 1: Compound grades FIRST (A+, B+, RA, AB, SA) - these take priority
        # Must run BEFORE single-char match so 'B+' stays 'B+', not just 'B'
        found_grades = []
        
        # Check single-token compounds first (e.g. "B+", "A+", "8T")
        for i, v in enumerate(texts):
            if v in ('A+', 'B+', 'A +', 'B +'):
                found_grades.append((v.replace(' ', ''), True))
            elif v in ('8+', '8T', '8t', '8-', 'B+ '):
                found_grades.append(('B+', True))
            elif v in ('RA', 'PA', 'R A', 'P A'):
                found_grades.append(('RA', True))
            elif v in ('SA', 'S A'):
                found_grades.append(('SA', True))
                
        # Check two-token compounds (A + +, R + A, etc.)
        if not found_grades:
            for i in range(len(texts) - 1):
                combined = texts[i] + texts[i+1]
                if combined in self.VALID_GRADES:
                    found_grades.append((combined, True))
                elif combined in ('8+', 'B+', '8T', '8t', '8-'):
                    found_grades.append(('B+', True))
                # Explicit compound grade patterns
                elif texts[i] in ('A', 'B', '8') and texts[i+1] == '+':
                    found_grades.append(((texts[i] if texts[i] != '8' else 'B') + '+', True))
                elif texts[i] in ('R', 'P') and texts[i+1] == 'A':
                    found_grades.append(('RA', True))
                elif texts[i] == 'S' and texts[i+1] == 'A':
                    found_grades.append(('SA', True))
                elif texts[i] == 'U' and texts[i+1] == 'A':
                    found_grades.append(('U', True))  # UA = absent = U grade
                # AB grade detection - VERY restrictive
                elif texts[i] == 'A' and texts[i+1] == 'B':
                    if (len(clean_tokens) == 2 and len(texts) == 2 and
                        abs(clean_tokens[0].center_x - clean_tokens[1].center_x) < 25):
                        found_grades.append(('AB', True))
                        logger.debug(f"  Accepted AB grade under strict conditions")
                    else:
                        # Don't auto-default to B, let it fall through to single grade detection
                        pass
        
        # PASS 2: Single character valid grades ONLY if no compounds found
            for t in clean_tokens:
                v = t.text.upper().strip()
                if v in self.VALID_GRADES:
                    found_grades.append((v, False))
                    
        if not found_grades:
            # PASS 3: OCR confusion translation for single chars
            for t in clean_tokens:
                v = t.text.strip()
                v_clean = trans.get(v, v.upper())
                if v_clean in self.VALID_GRADES:
                    found_grades.append((v_clean, False))
                    
        if not found_grades:
            # PASS 4: Regex search on concatenated text for embedded grades
            full_text = ' '.join(texts)
            # Find all grades matching regex
            matches = list(re.finditer(self.GRADE_PATTERN, full_text))
            for m in matches:
                found_grades.append((m.group(1), False))
                
        if found_grades:
            # For revaluation, the new grade is printed to the right of the old grade.
            # So we take the last detected grade. Otherwise the first.
            return found_grades[-1] if is_revaluation else found_grades[0]
            
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
            
            # Try header-based semester detection first
            for p in self.SEMESTER_PATTERNS:
                m = re.search(p, txt)
                if m:
                    s = m.group(1)
                    info.semester = {'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,'VIII':8}.get(s, int(s) if s.isdigit() else None)
                    break
            
            # If no semester from header, detect from the semester column (leftmost 2-digit numbers)
            if info.semester is None:
                sem_values = []
                for t in tokens:
                    v = t.text.strip()
                    if re.match(r'^0[1-8]$', v) and t.center_x < 250:
                        sem_values.append(int(v))
                if sem_values:
                    # Use the maximum semester value found (assuming the highest semester on the sheet is the current one)
                    # This fixes issues where a student writes many arrear exams and the mode fails.
                    info.semester = max(sem_values)
            
            for p in self.REGULATION_PATTERNS:
                m = re.search(p, txt)
                if m:
                    yr = re.search(r'20\d{2}', m.group(0))
                    if yr: info.regulation = f"R{yr.group(0)}"
                    break
            
            # Branch detection - look for branch keywords
            for b in self.BRANCH_NAMES:
                if b in txt:
                    mapping = {
                        'COMPUTER SCIENCE AND ENGINEERING': 'CSE',
                        'COMPUTER SCIENCE': 'CSE', 'INFORMATION TECHNOLOGY': 'IT',
                        'ELECTRONICS AND COMMUNICATION': 'ECE', 'ELECTRICAL AND ELECTRONICS': 'EEE',
                        'MECHANICAL': 'MECH', 'BIOMEDICAL': 'BME', 'BIO MEDICAL': 'BME',
                        'MEDICAL ELECTRONICS': 'MDE', 'MECHATRONICS': 'MCT'
                    }
                    info.branch = mapping.get(b, b)
                    # Check for specializations in parentheses
                    if 'CYBER' in txt: info.branch = 'CSE-CS'
                    break
            
            # Also check for partial branch text (OCR may break words)
            if not info.branch:
                branch_fragments = {
                    'MATION TECHNOLOGY': 'IT', 'RMATION TECHNOLOGY': 'IT',
                    'ORMATION TECHNOLOGY': 'IT', 'FORMATION TECHNOLOGY': 'IT',
                    'NFORMATION TECHNOLOGY': 'IT', 'INFORMATION': 'IT',
                    'ARTIFICIAL INTELLIGENCE': 'AIDS', 'DATA SCIENCE': 'AIDS',
                    'CYBER SECURITY': 'CSE-CS', 'CYBER': 'CSE-CS',
                    'COMPUTER SCIENCE AND ENGINEERING': 'CSE',
                    'OMPUTER SCIENCE': 'CSE',
                }
                for frag, branch in branch_fragments.items():
                    if frag in txt:
                        info.branch = branch
                        break
            
            reg = re.search(self.REGISTER_PATTERN, txt)
            if reg: info.register_number = reg.group(1)
            
            # Improved name detection - look for "Name:" field
            name = re.search(self.NAME_PATTERN, txt)
            if name: 
                name_val = name.group(1).strip()
                # Filter out false positives like "BRANCH"
                if name_val not in ['BRANCH', 'SEMESTER', 'GRADE', 'RESULT', 'CODE']:
                    info.student_name = name_val
            
            if 'ANNA' in txt and 'UNIVERSITY' in txt: info.institution = "Anna University"
            return info
        except: return SemesterInfo()

    # ------------------------------------------------------------------------
    # LAYER 7: VALIDATION & PRODUCTION AUTO-CORRECTION
    # ------------------------------------------------------------------------
    
    # OCR character confusions for subject codes
    _OCR_CHAR_MAP = {
        'O': ['0'], '0': ['O', 'D', 'Q'],
        'I': ['1', 'l'], '1': ['I', 'l', '7'],
        'S': ['5', '$'], '5': ['S'],
        'B': ['8'], '8': ['B'],
        'Z': ['2'], '2': ['Z'],
        'G': ['6'], '6': ['G'],
        'l': ['1', 'I'], 'D': ['0'],
        'Q': ['0'], '7': ['1'],
        'T': ['7'], 'C': ['(', 'G'],
    }

    def _fuzzy_match_subject_code(self, code: str, semester: int = None, branch: str = None) -> Tuple[str, str, float]:
        """
        Match an OCR'd subject code against the curriculum database.
        
        Returns: (best_code, status, confidence)
          status: "verified" | "corrected" | "unverified"
        """
        if not self.curriculum_service or not hasattr(self.curriculum_service, '_subject_db'):
            return code, "unverified", 0.3
        
        db = self.curriculum_service._subject_db
        
        # Strategy 1: Exact match
        if code in db:
            return code, "verified", 1.0
        
        # Strategy 2: Single-character OCR confusion substitutions
        for i, ch in enumerate(code):
            if ch in self._OCR_CHAR_MAP:
                for replacement in self._OCR_CHAR_MAP[ch]:
                    candidate = code[:i] + replacement + code[i+1:]
                    if candidate in db:
                        # If semester known, prefer match with same semester
                        sem_match = db[candidate].get('semester')
                        if semester and sem_match and sem_match != semester:
                            continue
                        return candidate, "corrected", 0.92
        
        # Strategy 3: Double-character OCR confusion substitutions
        for i in range(len(code)):
            if code[i] not in self._OCR_CHAR_MAP:
                continue
            for j in range(i + 1, len(code)):
                if code[j] not in self._OCR_CHAR_MAP:
                    continue
                for r1 in self._OCR_CHAR_MAP[code[i]]:
                    for r2 in self._OCR_CHAR_MAP[code[j]]:
                        candidate = list(code)
                        candidate[i] = r1
                        candidate[j] = r2
                        candidate = ''.join(candidate)
                        if candidate in db:
                            return candidate, "corrected", 0.82
        
        # Strategy 4: Prefix-based nearest match (same 2-letter prefix, same length)
        if len(code) >= 5:
            prefix = code[:2]
            candidates = [k for k in db if k[:2] == prefix and len(k) == len(code)]
            best, best_diff = None, len(code)
            for c in candidates:
                diff = sum(1 for a, b in zip(code, c) if a != b)
                if diff < best_diff:
                    best_diff = diff
                    best = c
            if best and best_diff <= 1:
                return best, "corrected", max(0.5, 0.85 - best_diff * 0.15)
        
        # Strategy 5: Stripped prefix (OCR adds garbage char at start)
        if len(code) >= 7:
            stripped = code[1:]
            if stripped in db:
                return stripped, "corrected", 0.85
        
        return code, "unverified", 0.3

    def _validate_grade(self, grade: str) -> Tuple[str, bool]:
        """Validate and auto-correct a grade value. Returns (corrected_grade, was_corrected)."""
        if grade in self.VALID_GRADES:
            return grade, False
        
        GRADE_FIXES = {
            '0': 'O', 'o': 'O',
            'a+': 'A+', 'A +': 'A+',
            'b+': 'B+', 'B +': 'B+',
            'a': 'A', 'b': 'B', 'c': 'C', 'p': 'P',
            'u': 'U', 'w': 'W',
            'ra': 'RA', 'Ra': 'RA',
            'ab': 'AB', 'Ab': 'AB',
            'sa': 'SA', 'Sa': 'SA',
            's': 'S', 'S+': 'A+',
            # Extended fixes for ROI misreads
            '8+': 'B+', '8+ ': 'B+', '8T': 'B+', '8t': 'B+', '8-': 'B+',
            '8': 'B', '6': 'G', 'B+ ': 'B+',
        }
        corrected = GRADE_FIXES.get(grade)
        if corrected:
            return corrected, True
        # Try uppercase
        corrected = GRADE_FIXES.get(grade.strip())
        if corrected:
            return corrected, True
        return grade, False

    def layer7_validate(self, subjects: List[SubjectData], info: SemesterInfo) -> Tuple[List[SubjectData], ProcessingMetadata]:
        meta = ProcessingMetadata()
        
        # ── Step 1: Deduplication ──
        if subjects:
            sorted_subs = sorted(subjects, key=lambda x: (len(x.subject_code), x.confidence), reverse=True)
            final_subs = []
            for s in sorted_subs:
                is_dup = False
                for existing in final_subs:
                    if s.row_index == existing.row_index:
                        if s.subject_code == existing.subject_code:
                            is_dup = True; break
                        if (len(s.subject_code) >= 4 and len(existing.subject_code) >= 4 and
                            len(s.subject_code) != len(existing.subject_code)):
                            if s.subject_code in existing.subject_code or existing.subject_code in s.subject_code:
                                is_dup = True; break
                if not is_dup:
                    final_subs.append(s)
                else:
                    meta.duplicates_removed += 1
            subjects = final_subs

        # ── Step 2: Curriculum-Based Auto-Correction (Subject Codes) ──
        if self.curriculum_service and hasattr(self.curriculum_service, '_subject_db'):
            semester = info.semester
            branch = info.branch
            for s in subjects:
                corrected_code, status, conf = self._fuzzy_match_subject_code(
                    s.subject_code, semester=semester, branch=branch
                )
                if status == "corrected":
                    s.original_code = s.subject_code
                    s.subject_code = corrected_code
                    s.confidence = max(s.confidence, conf)
                    meta.codes_auto_corrected += 1
                    meta.corrections.append({
                        'type': 'subject_code',
                        'from': s.original_code,
                        'to': corrected_code,
                        'confidence': round(conf, 2)
                    })
                    logger.info(f"AUTO-CORRECTED code: {s.original_code} → {corrected_code} (conf={conf:.2f})")
                elif status == "verified":
                    meta.codes_verified += 1
                else:
                    meta.codes_unverified += 1
                    logger.warning(f"UNVERIFIED code: {s.subject_code} — not found in curriculum database")
                
                s.validation_status = status

        # ── Step 3: Grade Validation & Correction ──
        for s in subjects:
            corrected_grade, was_corrected = self._validate_grade(s.grade)
            if was_corrected:
                s.original_grade = s.grade
                s.grade = corrected_grade
                meta.grades_corrected += 1
                meta.corrections.append({
                    'type': 'grade',
                    'subject': s.subject_code,
                    'from': s.original_grade,
                    'to': corrected_grade
                })
                logger.info(f"AUTO-CORRECTED grade: {s.subject_code} grade {s.original_grade} → {corrected_grade}")

        # ── Step 4: Credit Lookup from Curriculum ──
        if self.curriculum_service:
            b = info.branch or "CSE"
            r = (info.regulation or "2021").replace('R', '')
            for s in subjects:
                try:
                    cr = self.curriculum_service.get_credits(s.subject_code, branch=b, regulation=r)
                    # Include both credit and zero-credit subjects (like mandatory MX codes)
                    s.credits = cr.credits
                    meta.credits_filled_from_curriculum += 1
                    if cr.credits == 0:
                        logger.debug(f"Zero-credit subject found: {s.subject_code} (type: {getattr(cr, 'category', 'unknown')})")
                except Exception as e:
                    logger.debug(f"Credit lookup failed for {s.subject_code}: {e}")
                    pass

        if not subjects:
            return [], meta

        # ── Step 5: Main/Revaluation Aware Merge ──
        # Goal:
        # 1) Keep all main-table subjects as base list
        # 2) If same subject appears in revaluation table, override grade on top of main
        # 3) Preserve metadata for frontend badges/review
        main_map: Dict[str, SubjectData] = {}
        reval_map: Dict[str, SubjectData] = {}

        for s in subjects:
            key = s.subject_code
            if s.is_revaluation:
                if key not in reval_map or s.confidence >= reval_map[key].confidence:
                    reval_map[key] = s
            else:
                if key not in main_map or s.confidence >= main_map[key].confidence:
                    main_map[key] = s

        merged: List[SubjectData] = []

        # Base: main table subjects
        for code, m in main_map.items():
            if code in reval_map:
                r = reval_map[code]
                # Revaluation overrides main grade for final output
                m.main_grade = m.grade
                m.revaluation_grade = r.grade
                m.grade = r.grade
                m.overridden_by_revaluation = True
                m.review_required = (m.main_grade != m.revaluation_grade)
                # Keep higher confidence of the two sources
                m.confidence = max(m.confidence, r.confidence)
            merged.append(m)

        # Revaluation-only subjects (rare) should still be included
        for code, r in reval_map.items():
            if code not in main_map:
                r.overridden_by_revaluation = True
                r.revaluation_grade = r.grade
                r.review_required = True
                merged.append(r)

        # Sort by semester then subject code to support multi-semester-in-one-document preview
        res = sorted(
            merged,
            key=lambda x: ((x.original_semester if x.original_semester is not None else 99), x.subject_code)
        )

        # Confidence tagging based on numeric thresholds (for frontend row indicators)
        for s in res:
            if s.confidence >= 0.9:
                s.validation_status = s.validation_status or "high"
            elif s.confidence >= 0.7:
                s.validation_status = s.validation_status or "medium"
            else:
                s.validation_status = s.validation_status or "low"

        meta.fragments_merged = sum(1 for s in res if s.fragments_merged)

        # ── Step 6: Confidence Rating ──
        total = len(res)
        if total > 0:
            verified_pct = (meta.codes_verified + meta.codes_auto_corrected) / total
            if verified_pct >= 0.9 and meta.codes_unverified == 0:
                meta.confidence_rating = "HIGH"
            elif verified_pct >= 0.7:
                meta.confidence_rating = "MEDIUM"
            else:
                meta.confidence_rating = "LOW"
        else:
            meta.confidence_rating = "LOW"

        logger.info(
            f"Validation complete: {len(res)} subjects | "
            f"{meta.codes_verified} verified, {meta.codes_auto_corrected} corrected, "
            f"{meta.codes_unverified} unverified | "
            f"Confidence: {meta.confidence_rating}"
        )
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
