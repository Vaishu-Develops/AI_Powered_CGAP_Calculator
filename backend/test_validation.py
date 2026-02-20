"""
Test if BM8351 passes validation
"""
from ocr_service_v2 import EnhancedOCRService
import re

# Test the static method
is_valid = EnhancedOCRService._is_valid_code('BM8351')
print(f"Is BM8351 valid code? {is_valid}")

# Test the regex pattern
pattern = re.compile(r'([A-Z]{2,4}\d{3,5})\b', re.IGNORECASE)
matches = pattern.findall('BM8351')
print(f"Regex matches for 'BM8351': {matches}")

# Check blacklist
blacklist = {'PASS', 'FAIL', 'RESULT', 'ANNA', 'GRADE', 'SHEET'}
is_blacklisted = 'BM8351' in blacklist
print(f"Is BM8351 blacklisted? {is_blacklisted}")

# Manual validation check
code = 'BM8351'
print(f"\nManual validation of '{code}':")
print(f"  Length: {len(code)} (should be 5-8)")
letters = 0
for ch in code:
    if ch.isalpha():
        letters += 1
    else:
        break
print(f"  Letters at start: {letters} (should be >=2)")
digits = len(code) - letters
print(f"  Digit portion: {digits} (should be >=3)")
