@echo off
title PlatFight Studio - Builder
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js n'est pas installe.
  echo  Installe la version LTS depuis https://nodejs.org puis relance ce fichier.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)

echo.
echo  [0/2] Assemblage du jeu depuis src\ ...
pushd ..
call npm install
if errorlevel 1 (popd & goto erreur)
call node build.mjs --min
if errorlevel 1 (popd & goto erreur)
popd

echo.
echo  [1/2] Installation des outils (la premiere fois : quelques minutes)...
call npm install
if errorlevel 1 goto erreur

echo.
echo  [2/2] Construction de PlatFight Studio.exe...
call npm run build
if errorlevel 1 goto erreur

echo.
echo  ============================================================
echo   Termine ! Dans le dossier "dist" :
echo    - win-unpacked\PlatFight Studio.exe  (le jeu, pret a lancer)
echo    - PlatFight-Studio-*-windows.zip     (a mettre dans une Release)
echo    - PlatFight-Studio-*-portable.exe    (un seul fichier, sans installation)
echo  ============================================================
echo.
explorer dist
pause
exit /b 0

:erreur
echo.
echo  Le build a echoue. Copie le message d'erreur ci-dessus pour le corriger.
echo.
pause
exit /b 1
