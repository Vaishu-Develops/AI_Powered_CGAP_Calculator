import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from calculator import AnnaUniversityCGPA

def test_arrears_handling():
    calc = AnnaUniversityCGPA(branch="CSE", regulation="2021")
    
    # Simulate subjects payload similar to what handleConfirm sends
    # One failed attempt in Sem 1, one passed attempt later
    subjects_payload = [
        {'subject': 'MA3151', 'grade': 'RA', 'credits': 4, 'is_arrear': False}, # Sem 1 attempt
        {'subject': 'PH3151', 'grade': 'O',  'credits': 3, 'is_arrear': False},
        {'subject': 'MA3151', 'grade': 'B+', 'credits': 4, 'is_arrear': True},  # Attempting to clear in Sem 2
        {'subject': 'CS3251', 'grade': 'A',  'credits': 3, 'is_arrear': False},
    ]
    
    # We call from Sem 2
    result = calc.calculate_cgpa_from_grades(subjects_payload, semester=2)
    
    print(f"GPA Sem 2: {result['gpa']}")
    print(f"CGPA: {result['cgpa']}")
    print(f"Total Subjects in result: {len(result['subjects'])}")
    
    # Expected: MA3151 should only count once in CGPA with grade B+
    # Total passing credits should be: 3 (PH3151) + 4 (MA3151 B+) + 3 (CS3251) = 10
    # Total points: (10*3) + (7*4) + (8*3) = 30 + 28 + 24 = 82
    # CGPA should be: 82 / 10 = 8.2
    
    if result['cgpa'] < 8.2:
        print(f"BUG DETECTED: CGPA is {result['cgpa']}, expected 8.2 (or close).")
        print("This likely means credits were added twice or failing grade was included in denominator.")
    else:
        print("✅ Arrears handled correctly.")

if __name__ == "__main__":
    test_arrears_handling()
