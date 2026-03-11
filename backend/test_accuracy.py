from curriculum_service import CurriculumService

cs = CurriculumService()
# Note: In our current implementation, _subject_db is private but we can still check it for testing
db = cs._subject_db

print(f"Total subjects in DB: {len(db)}")

codes_to_test = ['MX3084', 'MX3085', 'MX3081']

for code in codes_to_test:
    if code in db:
        print(f"SUCCESS: {code} found in DB: {db[code]}")
        res = cs.get_credits(code)
        print(f"  Lookup Result: {res.credits} credits, source={res.source}")
    else:
        print(f"FAILURE: {code} NOT found in DB")
