@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title PlatFight Studio - mise a jour

echo.
echo  ==========================================
echo    PlatFight Studio : mise à jour du jeu
echo  ==========================================
echo.

rem --- Node.js est indispensable pour construire le jeu
where node >nul 2>nul
if errorlevel 1 goto pas_de_node

rem --- Récupérer la dernière version (si le dossier est un clone Git)
if not exist ".git" goto pas_de_git_dossier
where git >nul 2>nul
if errorlevel 1 goto pas_de_git
echo [1/5] Récupération de la dernière version sur GitHub...
git pull --ff-only
if errorlevel 1 echo     Impossible de récupérer la mise à jour : je reconstruis la version actuelle.
goto construire

:pas_de_git_dossier
echo [1/5] Ce dossier n'est pas un clone Git : je reconstruis la version actuelle.
goto construire

:pas_de_git
echo [1/5] Git n'est pas installé : je reconstruis la version actuelle.
echo     Pour les mises à jour automatiques, installe Git : https://git-scm.com

:construire
rem --- Le jeu ne doit pas tourner pendant qu'on remplace ses fichiers
taskkill /im "PlatFight Studio.exe" /f >nul 2>nul

echo.
echo [2/5] Installation des outils (la première fois, ça peut prendre quelques minutes)...
call npm install --no-audit --no-fund
if errorlevel 1 goto erreur

echo.
echo [3/5] Assemblage du jeu...
call node build.mjs --min
if errorlevel 1 goto erreur

echo.
echo [4/5] Construction de l'application Windows...
copy /y "dist\index.html" "desktop\index.html" >nul
if errorlevel 1 goto erreur
pushd desktop
call npm install --no-audit --no-fund
if errorlevel 1 goto erreur_desktop
call npx electron-builder --win dir --x64
if errorlevel 1 goto erreur_desktop
popd

echo.
echo [5/5] Mise en place dans PlatFight-Studio-Windows\PlatFight Studio...
robocopy "desktop\sortie\win-unpacked" "PlatFight-Studio-Windows\PlatFight Studio" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto erreur

echo.
echo  Terminé ! Le jeu est à jour.
echo  Tes persos et stages ne sont pas touchés (ils sont gardés dans %%APPDATA%%\PlatFight Studio).
echo.
choice /c ON /m "Lancer PlatFight Studio maintenant"
if errorlevel 2 goto fin
start "" "PlatFight-Studio-Windows\PlatFight Studio\PlatFight Studio.exe"
goto fin

:pas_de_node
echo  Node.js n'est pas installé : il sert à construire le jeu.
echo  Télécharge la version LTS sur https://nodejs.org, installe-la,
echo  puis relance ce fichier.
start "" "https://nodejs.org"
goto fin_erreur

:erreur_desktop
popd
:erreur
echo.
echo  La mise à jour a échoué (voir les messages ci-dessus).
echo  Vérifie ta connexion internet et relance ce fichier.

:fin_erreur
echo.
pause
exit /b 1

:fin
endlocal
exit /b 0
