from paddleocr import PaddleOCR
import cv2
import os
import numpy as np
import json
import re

# Initialize PaddleOCR
# det_db_thresh: Threshold for binarizing the segmentation map (default 0.3)
# det_db_box_thresh: Threshold for the box score (default 0.6)
# det_db_unclip_ratio: Unclip ratio for the box (default 1.5)
ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)

def preprocess_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Image not found at {image_path}")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Apply adaptive thresholding to handle varying lighting/shadows
    # This creates a binary image which is often easier for OCR
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    # Dilation to make text bolder if it's too thin
    # kernel = np.ones((1, 1), np.uint8)
    # dilated = cv2.dilate(thresh, kernel, iterations=1)
    
    return img, gray, thresh

def filter_text_lines(lines):
    filtered_data = []
    
    # Regex patterns
    subject_code_pattern = re.compile(r'^[A-Z]{2,}\d{3,}[A-Z]*$') # e.g., EE2201
    grade_pattern = re.compile(r'^[SABCDEUWI]$') # Standard grades
    
    for line in lines:
        line_obj = {
            "raw_text": " ".join([item[1] for item in line]),
            "items": [],
            "type": "unknown"
        }
        
        # Classify items in the line
        for box, text, score in line:
            item_type = "other"
            if subject_code_pattern.match(text):
                item_type = "subject_code"
            elif grade_pattern.match(text):
                item_type = "grade"
            elif text.upper() in ["PASS", "FAIL", "RA", "WH"]:
                item_type = "result"
            elif text.isdigit() and len(text) <= 2:
                item_type = "semester" # Likely semester
                
            line_obj["items"].append({
                "text": text,
                "confidence": score,
                "type": item_type,
                "box": box
            })
            
        # Determine line type (Header, Subject Row, etc.)
        types = [item["type"] for item in line_obj["items"]]
        if "subject_code" in types and "grade" in types:
            line_obj["type"] = "subject_row"
        elif "subject_code" in types:
             line_obj["type"] = "subject_row_partial" # Maybe missed grade
            
        filtered_data.append(line_obj)
        
    return filtered_data

# Image Path
img_path = r'D:\CGPA Calculator\backend\test\portal5.png'

try:
    original, gray, thresh = preprocess_image(img_path)
    
    # Run OCR on the Thresholded image for better clarity
    # Sometimes original or gray is better. We can try multiple if needed.
    print("Running OCR on thresholded image...")
    result = ocr.ocr(thresh, cls=True)
    
    if not result or result[0] is None:
        print("No text detected.")
        exit()

    # Flatten results
    boxes = [line[0] for line in result[0]]
    txts = [line[1][0] for line in result[0]]
    scores = [line[1][1] for line in result[0]]

    # Group by lines
    def get_lines(boxes, txts, scores, y_threshold=10):
        data = list(zip(boxes, txts, scores))
        data.sort(key=lambda x: x[0][0][1])
        
        lines = []
        current_line = []
        
        for item in data:
            box = item[0]
            top_y = box[0][1] # Top-left Y
            
            if not current_line:
                current_line.append(item)
                continue
            
            # Simple Y-alignment check
            ref_y = sum([i[0][0][1] for i in current_line]) / len(current_line)
            
            if abs(top_y - ref_y) < y_threshold:
                current_line.append(item)
            else:
                current_line.sort(key=lambda x: x[0][0][0]) # Sort by X
                lines.append(current_line)
                current_line = [item]
        
        if current_line:
            current_line.sort(key=lambda x: x[0][0][0])
            lines.append(current_line)
            
        return lines

    lines = get_lines(boxes, txts, scores)
    structured_data = filter_text_lines(lines)

    # Output JSON structure
    output = {
        "raw_lines": [l["raw_text"] for l in structured_data],
        "parsed_subjects": [l for l in structured_data if "subject_row" in l["type"]]
    }
    
    print(json.dumps(output, indent=2))
    
    # Save to file for inspection
    with open('backend/test/ocr_parsed.json', 'w') as f:
        json.dump(output, f, indent=2)

except Exception as e:
    print(f"Error: {e}")
