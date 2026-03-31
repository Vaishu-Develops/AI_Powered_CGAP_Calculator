import json
import os
import glob
from database import SessionLocal, engine
from models import Base, CurriculumSubject

def seed_curriculum():
    db = SessionLocal()
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    # Empty existing curriculum data to avoid duplicates
    db.query(CurriculumSubject).delete()
    
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    json_files = glob.glob(os.path.join(data_dir, "curriculum_*.json"))
    
    total_inserted = 0
    for file_path in json_files:
        branch_code = os.path.basename(file_path).split('_')[1].split('.')[0].upper()
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        semesters = data.get("semesters")
        
        if isinstance(semesters, dict):
            # New format (nested semesters dict)
            for sem_str, sem_data in semesters.items():
                if not sem_str.isdigit():
                    continue
                sem_num = int(sem_str)
                subjects = sem_data.get("subjects", {})
                
                if isinstance(subjects, dict):
                    for subj_code, subj_info in subjects.items():
                        new_subj = CurriculumSubject(
                            regulation="2021", branch=branch_code,
                            subject_code=subj_code, title=subj_info.get("name", ""),
                            credits=subj_info.get("credits", 0), semester=sem_num, is_elective=False
                        )
                        db.add(new_subj)
                        total_inserted += 1
                elif isinstance(subjects, list):
                    for subj_info in subjects:
                        code = subj_info.get("code", subj_info.get("subject_code", ""))
                        name = subj_info.get("name", subj_info.get("subject_name", ""))
                        new_subj = CurriculumSubject(
                            regulation="2021", branch=branch_code,
                            subject_code=code, title=name,
                            credits=subj_info.get("credits", 0), semester=sem_num, is_elective=False
                        )
                        db.add(new_subj)
                        total_inserted += 1

        elif isinstance(semesters, list):
            # CCE/PE Format (array of {semester, subjects[]})
            for sem_data in semesters:
                sem_num = int(sem_data.get("semester", 1))
                subjects = sem_data.get("subjects", [])
                for subj_info in subjects:
                    code = subj_info.get("code", subj_info.get("subject_code", ""))
                    name = subj_info.get("name", subj_info.get("subject_name", ""))
                    new_subj = CurriculumSubject(
                        regulation="2021", branch=branch_code,
                        subject_code=code, title=name,
                        credits=subj_info.get("credits", 0), semester=sem_num, is_elective=False
                    )
                    db.add(new_subj)
                    total_inserted += 1

        else:
            # Old format (Semester X mapping)
            for sem_key, subj_list in data.items():
                if not sem_key.startswith("Semester "):
                    continue
                sem_num = int(sem_key.replace("Semester ", ""))
                for subj in subj_list:
                    new_subj = CurriculumSubject(
                        regulation="2021",
                        branch=branch_code,
                        subject_code=subj["subject_code"],
                        title=subj.get("subject_name", ""),
                        credits=subj["credits"],
                        semester=sem_num,
                        is_elective=False
                    )
                    db.add(new_subj)
                    total_inserted += 1
                
    db.commit()
    db.close()
    print(f"Success! Seeded {total_inserted} curriculum subjects.")

if __name__ == "__main__":
    seed_curriculum()
