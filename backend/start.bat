@echo off
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║   AI Cyber Risk Optimizer — Backend (FastAPI)        ║
echo  ║   SIH26105                                           ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

if not exist ".env" (
    echo  ERROR: backend\.env not found.
    echo  Copy backend\.env.example to backend\.env and fill in your credentials.
    echo.
    pause
    exit /b 1
)

echo  Starting FastAPI on http://localhost:8000
echo  API docs: http://localhost:8000/docs
echo  Press Ctrl+C to stop.
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
