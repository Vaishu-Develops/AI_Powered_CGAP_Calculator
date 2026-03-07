"""Quick verification that MX3084 and SB3001 are now recognized"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from curriculum_service import CurriculumService

cs = CurriculumService()

# Test MX3084 - should now be found via mandatory_courses loading
r1 = cs.get_credits('MX3084', branch='IT')
print(f"MX3084: credits={r1.credits}, source={r1.source}, conf={r1.confidence}, name={r1.subject_name}")
print(f"  MX3084 in _subject_db: {'MX3084' in cs._subject_db}")

# Test SB3001 - should be recognized via pattern rule
r2 = cs.get_credits('SB3001', branch='IT')
print(f"SB3001: credits={r2.credits}, source={r2.source}, conf={r2.confidence}")

# Test NM codes
r3 = cs.get_credits('NM1086', branch='IT')
print(f"NM1086: credits={r3.credits}, source={r3.source}, conf={r3.confidence}")

# Count subjects
print(f"\nTotal subjects loaded: {len(cs._subject_db)}")

# Check if some MX codes are now in DB
mx_codes = [k for k in cs._subject_db if k.startswith('MX')]
print(f"MX codes in DB: {mx_codes}")
