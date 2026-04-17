import os
from database import SessionLocal, engine
from models import Base, CurriculumSubject
from curriculum_service import CurriculumService

def seed_curriculum():
    db = SessionLocal()
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    print("Clearing existing table...")
    # Empty existing curriculum data to avoid duplicates
    db.query(CurriculumSubject).delete()
    db.commit()
    
    print("Loading curriculum definitions using CurriculumService's JSON parser...")
    # Initialize the service WITHOUT db_session so it falls back to parsing all JSONs into memory
    svc = CurriculumService(db_session=None)
    
    total_inserted = 0
    # The unified _subject_db now contains mandatory, verticals, open, and professional electives securely mapped!
    for code, info in svc._subject_db.items():
        semester = info.get('semester')
        if semester is None: 
            semester = 0 # Default to 0 for floating electives
            
        new_subj = CurriculumSubject(
            regulation="2021",
            branch=info.get('branch', 'CSE'),
            subject_code=code,
            title=info.get('name', ''),
            credits=float(info.get('credits', 0)),
            semester=int(semester),
            is_elective=(info.get('category') in ['PEC', 'OEC'])  # Use original category flag if exists
        )
        db.add(new_subj)
        total_inserted += 1
        
    print(f"Committing {total_inserted} total subjects to Neon...")
    db.commit()
    db.close()
    print(f"Success! Perfect 1:1 database seed complete.")

if __name__ == "__main__":
    seed_curriculum()
