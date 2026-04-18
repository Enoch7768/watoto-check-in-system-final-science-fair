@echo off
title Unified Dev Environment Starter


:: 3. Start Watoto Check-in System (NPM)
echo Starting Watoto Check-in System...
cd /d "C:\Users\MARTPLUS\Downloads\Science Fair FInal\watoto-check-in-systemfinalsciencefair"
start "Watoto_Dev" cmd /k "npm run dev"

:: 4. Wait for Node server, then open its browser link
timeout /t 8 /nobreak
start "" "http://localhost:3000"

:: 5. Start ZK Production
echo Starting ZK Production...
cd /d "C:\Users\MARTPLUS\Downloads\Science Fair FInal\zk-productionfinal"
start "ZK_Prod" cmd /k "start.bat"


timeout /t 8 /nobreak
start "" "http://localhost:3000"


echo.
echo ===========================================
echo ALL SERVICES ARE LIVE
echo ===========================================
pause