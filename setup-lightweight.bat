@echo off
echo ========================================
echo RKS Mahila Sangha - Lightweight Setup
echo ========================================
echo.
echo This will install dependencies for all apps
echo Project is cleaned for MySQL-based local demo
echo.
echo [1/4] Installing Frontend dependencies...
cd /d "d:\Internship\RKS\RKS Mahila Sangha"
npm install
echo.
echo [2/4] Installing Admin dependencies...
cd /d "d:\Internship\RKS\RKS Mahila Sangha Admin"
npm install
echo.
echo [3/4] Installing Backend dependencies...
cd /d "d:\Internship\RKS\backend"
npm install
echo.
echo [4/4] Setup complete!
echo.
echo Next steps:
echo 1. Create MySQL DB: rks_mahila_sangha
echo 2. Import backend\database\schema.sql
echo 3. Update backend\.env values
echo 4. Start backend: cd backend ^&^& npm run dev
echo 5. Start frontend: cd "RKS Mahila Sangha" ^&^& npm run dev
echo 6. Start admin: cd "RKS Mahila Sangha Admin" ^&^& npm run dev
echo.
echo Payment is currently simulated for local demo.
echo.
pause
