from database import SessionLocal
from models import User, Report, SubjectRow
from main import get_user_reports
from fastapi import HTTPException

db = SessionLocal()
try:
    email = "rethanya@gmail.com"
    user = db.query(User).filter(User.email == email).first()
    print(f"User: {user.email}, ID: {user.id}, FirebaseUID: {user.firebase_uid}")
    
    reports = db.query(Report).filter(Report.user_id == user.id).all()
    print(f"Total Raw Reports in DB: {len(reports)}")
    
    # Simulate API call
    try:
        response = get_user_reports(user.firebase_uid, db)
        print(f"API Response 'reports' count: {len(response.get('reports', []))}")
        if len(response.get('reports', [])) > 0:
            print("First Report Sample:", response['reports'][0])
    except Exception as e:
        print(f"API Error: {e}")
finally:
    db.close()
