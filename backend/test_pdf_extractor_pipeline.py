"""
Standalone PDF -> OCR test pipeline.

Goal:
- Try PDF text extraction using a PDF library.
- Render PDF pages to images.
- Run existing OCR pipeline (SevenLayerOCRService) on rendered pages.
- Run existing calculator flow on extracted grades.
- Print everything to terminal for experimentation.

This script does NOT modify any API routes or current app behavior.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

from ocr_service_v3 import SevenLayerOCRService
from calculator import AnnaUniversityCGPA


def try_extract_pdf_text(pdf_path: Path) -> Tuple[Optional[str], str]:
    """Try extracting text from PDF using available libraries."""
    # Attempt 1: pypdf
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(str(pdf_path))
        text_parts: List[str] = []
        for idx, page in enumerate(reader.pages, start=1):
            txt = page.extract_text() or ""
            text_parts.append(f"\n--- PAGE {idx} ---\n{txt}")
        return "\n".join(text_parts).strip(), "pypdf"
    except Exception:
        pass

    # Attempt 2: pdfplumber
    try:
        import pdfplumber  # type: ignore

        text_parts = []
        with pdfplumber.open(str(pdf_path)) as pdf:
            for idx, page in enumerate(pdf.pages, start=1):
                txt = page.extract_text() or ""
                text_parts.append(f"\n--- PAGE {idx} ---\n{txt}")
        return "\n".join(text_parts).strip(), "pdfplumber"
    except Exception:
        pass

    return None, "none"


def render_pdf_pages_to_images(pdf_path: Path, dpi: int = 220, max_pages: int = 6) -> Tuple[List[np.ndarray], str]:
    """Render PDF pages to BGR images using any available PDF renderer."""
    # Attempt 1: PyMuPDF (fitz)
    try:
        import fitz  # type: ignore

        doc = fitz.open(str(pdf_path))
        imgs: List[np.ndarray] = []
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)

        for i in range(min(len(doc), max_pages)):
            page = doc[i]
            pix = page.get_pixmap(matrix=mat, alpha=False)
            arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            if pix.n == 4:
                arr = cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR)
            elif pix.n == 3:
                arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
            imgs.append(arr)

        return imgs, "pymupdf"
    except Exception:
        pass

    # Attempt 2: pypdfium2
    try:
        import pypdfium2 as pdfium  # type: ignore

        doc = pdfium.PdfDocument(str(pdf_path))
        imgs = []
        scale = dpi / 72.0

        for i in range(min(len(doc), max_pages)):
            page = doc[i]
            bitmap = page.render(scale=scale)
            pil_img = bitmap.to_pil()
            arr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            imgs.append(arr)

        return imgs, "pypdfium2"
    except Exception:
        pass

    # Attempt 3: pdf2image
    try:
        from pdf2image import convert_from_path  # type: ignore

        pages = convert_from_path(str(pdf_path), dpi=dpi, first_page=1, last_page=max_pages)
        imgs = [cv2.cvtColor(np.array(p), cv2.COLOR_RGB2BGR) for p in pages]
        return imgs, "pdf2image"
    except Exception:
        pass

    return [], "none"


def normalize_for_calculator(subjects: List[Dict]) -> List[Dict]:
    """Map OCR subjects to calculator input schema."""
    out: List[Dict] = []
    for s in subjects:
        out.append(
            {
                "subject": str(s.get("subject_code", "")).upper(),
                "grade": str(s.get("grade", "")).upper(),
                "credits": float(s.get("credits", 3) or 3),
                "marks": s.get("marks"),
                "is_arrear": bool(s.get("is_arrear", False)),
                "original_semester": s.get("original_semester"),
            }
        )
    return [r for r in out if r["subject"]]


def run_page_ocr(service: SevenLayerOCRService, page_bgr: np.ndarray) -> Tuple[Optional[Dict], Optional[str]]:
    ok, encoded = cv2.imencode(".jpg", page_bgr)
    if not ok:
        return None, "Failed to encode rendered PDF page to image"
    return service.process_marksheet(encoded.tobytes())


def main() -> None:
    parser = argparse.ArgumentParser(description="Standalone PDF extractor + OCR test")
    parser.add_argument("--pdf", type=str, default="backend/test/download.pdf", help="Path to input PDF")
    parser.add_argument("--dpi", type=int, default=220, help="Render DPI for PDF pages")
    parser.add_argument("--max-pages", type=int, default=6, help="Max PDF pages to process")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        raise SystemExit(f"PDF not found: {pdf_path}")

    print("=" * 78)
    print("PDF EXTRACTOR + OCR PIPELINE TEST")
    print("=" * 78)
    print(f"Input PDF: {pdf_path}")

    # 1) PDF text extraction test
    text, text_engine = try_extract_pdf_text(pdf_path)
    print("\n[1] PDF text extraction")
    print(f"Engine used: {text_engine}")
    if text:
        preview = text[:1500].replace("\n", " ")
        print(f"Extracted text chars: {len(text)}")
        print(f"Text preview: {preview}")
    else:
        print("No extractable text (likely scanned-image PDF) or library missing.")

    # 2) Render PDF pages to images
    print("\n[2] Render PDF pages to images")
    page_images, render_engine = render_pdf_pages_to_images(pdf_path, dpi=args.dpi, max_pages=args.max_pages)
    print(f"Render engine used: {render_engine}")
    print(f"Pages rendered: {len(page_images)}")
    if not page_images:
        print("Could not render PDF pages. Install one of: pymupdf, pypdfium2, pdf2image.")
        return

    # 3) OCR each page using existing service
    print("\n[3] OCR pipeline on rendered pages")
    ocr = SevenLayerOCRService()
    all_subjects: List[Dict] = []
    semester_hits: Dict[int, int] = {}

    for idx, img in enumerate(page_images, start=1):
        result, err = run_page_ocr(ocr, img)
        if err or not result:
            print(f"- Page {idx}: OCR failed: {err}")
            continue

        sem = int((result.get("semester_info") or {}).get("semester") or 0)
        subs = result.get("subjects", []) or []
        print(f"- Page {idx}: semester={sem or '?'} subjects={len(subs)}")

        if sem > 0:
            semester_hits[sem] = semester_hits.get(sem, 0) + len(subs)

        all_subjects.extend(subs)

    # Deduplicate by (subject_code, grade, semester) to avoid duplicate page detections
    seen = set()
    deduped: List[Dict] = []
    for s in all_subjects:
        key = (
            str(s.get("subject_code", "")).upper(),
            str(s.get("grade", "")).upper(),
            int(s.get("original_semester") or 0),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(s)

    print(f"Total OCR subjects (raw): {len(all_subjects)}")
    print(f"Total OCR subjects (deduped): {len(deduped)}")

    if deduped:
        print("\nSample OCR rows:")
        for s in deduped[:12]:
            print(
                f"  {s.get('subject_code','?'):>8}  grade={s.get('grade','?'):<3} "
                f"credits={s.get('credits','?')} sem={s.get('original_semester','?')}"
            )

    # 4) Existing regular calculation flow test
    print("\n[4] Calculator flow on OCR output")
    grades_data = normalize_for_calculator(deduped)
    if not grades_data:
        print("No grades available for calculator test.")
        return

    calc = AnnaUniversityCGPA(branch="CSE", regulation="2021")
    # Use max detected semester as a practical default for cumulative test
    detected_sem = max([s.get("original_semester") or 1 for s in deduped] + [1])
    calc_result = calc.calculate_cgpa_from_grades(grades_data, semester=int(detected_sem))

    print(json.dumps(
        {
            "detected_semester_for_calc": int(detected_sem),
            "gpa": calc_result.get("gpa"),
            "cgpa": calc_result.get("cgpa"),
            "percentage": calc_result.get("percentage"),
            "class": calc_result.get("class"),
            "total_subjects": calc_result.get("total_subjects"),
            "passed_subjects": calc_result.get("passed_subjects"),
            "failed_subjects": calc_result.get("failed_subjects"),
            "semester_hits": semester_hits,
        },
        indent=2,
    ))

    print("\nDone. This was a standalone test run only; no app code path was changed.")


if __name__ == "__main__":
    main()
