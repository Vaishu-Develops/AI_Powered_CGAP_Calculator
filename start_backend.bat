@echo off
cd backend
call ..\venv\Scripts\activate
..\venv\Scripts\python.exe -m uvicorn main:app --reload
pause
