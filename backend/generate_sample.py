from PIL import Image, ImageDraw, ImageFont
import os

def create_sample_marksheet():
    # Create white image
    width, height = 800, 600
    img = Image.new('RGB', (width, height), color='white')
    d = ImageDraw.Draw(img)
    
    # Try to load a font, else default
    try:
        font_large = ImageFont.truetype("arial.ttf", 24)
        font_small = ImageFont.truetype("arial.ttf", 16)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Header
    d.text((50, 30), "ANNA UNIVERSITY, CHENNAI", font=font_large, fill='black')
    d.text((50, 60), "GRADE SHEET", font=font_large, fill='black')
    
    # Table Header
    y = 120
    d.text((50, y), "Subject Code", font=font_small, fill='black')
    d.text((250, y), "Subject Name", font=font_small, fill='black')
    d.text((550, y), "Grade", font=font_small, fill='black')
    d.text((650, y), "Result", font=font_small, fill='black')
    
    # Data Rows
    subjects = [
        ("CS6303", "Computer Architecture", "B+", "PASS"),
        ("CS6363", "Database Management", "B+", "PASS"),
        ("CS6383", "Data Structures", "B", "PASS"),
        ("CS6343", "Operating Systems", "A", "PASS"),
        ("CS6323", "Software Engineering", "O", "PASS"),
    ]
    
    y += 40
    for code, name, grade, result in subjects:
        d.text((50, y), code, font=font_small, fill='black')
        d.text((250, y), name, font=font_small, fill='black')
        d.text((560, y), grade, font=font_small, fill='black')
        d.text((650, y), result, font=font_small, fill='black')
        y += 30
        
    img.save("sample_marksheet.png")
    print("Sample marksheet created: sample_marksheet.png")

if __name__ == "__main__":
    create_sample_marksheet()
