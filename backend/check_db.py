import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from curriculum_service import CurriculumService
cs = CurriculumService()
db = cs._subject_db
nm = [k for k in db if k.startswith('NM')]
print(f"NM codes in DB: {nm}")
print(f"NM1026 in DB: {'NM1026' in db}")
print(f"NM1022 in DB: {'NM1022' in db}")
print(f"NM1086 in DB: {'NM1086' in db}")
print(f"NM1087 in DB: {'NM1087' in db}")

# Check GE subjects too
ge_subs = sorted([k for k in db if k.startswith('GE3') and len(k) == 6])
print(f"\nGE3xxx codes in DB ({len(ge_subs)}): {ge_subs[:30]}")

# Check CCS codes
ccs = sorted([k for k in db if k.startswith('CCS')])
print(f"\nCCS codes in DB ({len(ccs)}): {ccs[:20]}")
