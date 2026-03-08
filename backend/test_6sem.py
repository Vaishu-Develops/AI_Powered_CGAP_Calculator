# -*- coding: utf-8 -*-
"""
Comprehensive test: Call the running OCR preview API for each of the 6 semester images
and compare extraction against manually-verified ground truth.
"""
import requests, json, os, sys
# Force UTF-8 output
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

API_URL = "http://localhost:8000/preview-ocr/"

# Ground truth from visual inspection of each image
GROUND_TRUTH = {
    "download.png": {
        "label": "Sem 1 (Nov/Dec 2022)",
        "subjects": {
            "BS3171": "A", "CY3151": "B", "GE3151": "B+", "GE3152": "O",
            "GE3171": "O", "GE3172": "A", "HS3152": "B+", "MA3151": "U",
            "PH3151": "B+"
        }
    },
    "WhatsApp Image 2026-03-03 at 17.30.16.png": {
        "label": "Sem 2 (Apr/May 2023)",
        "subjects": {
            "BE3251": "B", "CS3251": "B+", "CS3271": "O", "GE3251": "A",
            "GE3252": "B+", "GE3271": "A+", "GE3272": "A", "HS3252": "A",
            "MA3251": "B+", "PH3256": "B+",
            "GE3152": "B+",
            "MA3151": "U",
        }
    },
    "Screenshot 2024-04-23 204431.png": {
        "label": "Sem 3 (Nov/Dec 2023)",
        "subjects": {
            "CS3301": "C", "CS3311": "O", "CS3351": "B+", "CS3352": "U",
            "CS3361": "A+", "CS3381": "O", "CS3391": "C", "GE3361": "O",
            "MA3354": "B", "MA3151": "B"
        }
    },
    "Screenshot 2024-09-28 084450.png": {
        "label": "Sem 4 (Apr/May 2024)",
        "subjects": {
            "CS3401": "B+", "CS3451": "C", "CS3452": "U", "CS3461": "O",
            "CS3481": "O", "CS3491": "B", "CS3492": "U", "GE3451": "C",
            "NM1022": "O", "CS3352": "B"
        }
    },
    "Screenshot 2025-04-04 222927.png": {
        "label": "Sem 5 (Nov/Dec 2024)",
        "subjects": {
            "CB3491": "U", "CCS336": "B+",
            "CCS375": "A", "CS3501": "B+", "CS3551": "U", "CS3591": "A",
            "MX3084": "O", "NM1026": "O",
            "CS3452": "U",
            "CS3492": "B+",
        }
    },
    "Screenshot 2025-10-26 140425.png": {
        "label": "Sem 6 (Apr/May 2025) + Reval",
        "subjects": {
            "CCS345": "B+", "CCS354": "B+", "CCS356": "A", "CCS367": "B",
            "CCS370": "B+",
            "CS3691": "B+", "MX3085": "O", "NM1087": "O",
            "CB3491": "B+",
            "CS3551": "U",
            "CS3452": "U",
        },
        "reval_subjects": {
            "CS3551": "B",
            "CS3452": "B+",
        }
    },
}

TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test")

total_expected = 0
total_found = 0
total_missing = 0
total_wrong_grade = 0
all_results = {}

for filename, truth in GROUND_TRUTH.items():
    filepath = os.path.join(TEST_DIR, filename)
    if not os.path.exists(filepath):
        print(f"\n[!] File not found: {filepath}")
        continue
    
    print(f"\n{'='*70}")
    print(f"  {truth['label']} -- {filename}")
    print(f"{'='*70}")
    
    with open(filepath, 'rb') as f:
        resp = requests.post(API_URL, files={"file": (filename, f, "image/png")})
    
    if resp.status_code != 200:
        print(f"  [X] API Error: {resp.status_code} -- {resp.text[:200]}")
        continue
    
    data = resp.json()
    extracted = {s['subject_code']: s['grade'] for s in data.get('subjects', [])}
    
    print(f"  Expected: {len(truth['subjects'])} subjects")
    print(f"  Extracted: {len(extracted)} subjects")
    print(f"  Extracted codes: {list(extracted.keys())}")
    
    found = 0
    missing = []
    wrong_grade = []
    extra = []
    
    for code, expected_grade in truth['subjects'].items():
        total_expected += 1
        if code in extracted:
            found += 1
            total_found += 1
            if extracted[code] != expected_grade:
                wrong_grade.append(f"    {code}: expected={expected_grade}, got={extracted[code]}")
                total_wrong_grade += 1
        else:
            missing.append(code)
            total_missing += 1
    
    for code in extracted:
        if code not in truth['subjects']:
            reval = truth.get('reval_subjects', {})
            if code not in reval:
                extra.append(f"{code}({extracted[code]})")
    
    if missing:
        print(f"  [X] MISSING ({len(missing)}): {', '.join(missing)}")
    if wrong_grade:
        print(f"  [!] WRONG GRADE ({len(wrong_grade)}):")
        for w in wrong_grade:
            print(w)
    if extra:
        print(f"  [?] EXTRA (unexpected): {', '.join(extra)}")
    if not missing and not wrong_grade:
        print(f"  [OK] ALL {found} subjects matched correctly!")
    
    if 'reval_subjects' in truth:
        reval_found = 0
        reval_missing = []
        for code, grade in truth['reval_subjects'].items():
            if code in extracted:
                reval_found += 1
                if extracted[code] != grade:
                    print(f"  [i] Reval {code}: expected reval grade={grade}, got={extracted[code]}")
            else:
                reval_missing.append(code)
        if reval_missing:
            print(f"  [X] REVAL MISSING: {', '.join(reval_missing)}")
        else:
            print(f"  [OK] Revaluation subjects detected")
    
    all_results[filename] = {
        "label": truth['label'], 
        "expected": len(truth['subjects']),
        "extracted": len(extracted),
        "extracted_subjects": extracted,
        "missing": missing,
        "extra": extra,
    }

print(f"\n{'='*70}")
print(f"  SUMMARY")
print(f"{'='*70}")
print(f"  Total Expected:    {total_expected}")
print(f"  Total Found:       {total_found}")
print(f"  Total Missing:     {total_missing}")
print(f"  Total Wrong Grade: {total_wrong_grade}")
print(f"  Accuracy:          {total_found / max(total_expected, 1) * 100:.1f}%")

with open(os.path.join(TEST_DIR, "full_6sem_test_results.json"), 'w') as f:
    json.dump(all_results, f, indent=2)
    print(f"\nResults saved to test/full_6sem_test_results.json")
