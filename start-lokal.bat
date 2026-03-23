@echo off
title Family Hub — Lokal
color 0A
cd /d "%~dp0"

echo ==========================================
echo   Family Hub — Lokaler Entwicklungsstart
echo ==========================================
echo.

REM SSH Tunnel zum Server-Postgres starten (nur localhost, kein Internetzugang)
echo [1/4] Starte SSH-Tunnel zur Datenbank auf dem Server...
start "SSH Tunnel" /min ssh -i "C:\Users\sebas\Desktop\id_rsa_fixed" ^
  -L 5433:localhost:5433 ^
  -N ^
  -o StrictHostKeyChecking=no ^
  -o ServerAliveInterval=30 ^
  root@188.245.189.141

echo       Warte 4 Sekunden bis Tunnel bereit ist...
timeout /t 4 /nobreak >nul

REM Abhängigkeiten installieren falls node_modules fehlt
echo [2/4] Prüfe Abhängigkeiten...
if not exist node_modules (
  echo       node_modules nicht gefunden, installiere...
  npm install
)

REM .env.local muss vorhanden sein
if not exist .env.local (
  echo.
  echo FEHLER: .env.local nicht gefunden!
  echo Bitte .env.local.example zu .env.local kopieren und ausfüllen.
  echo.
  pause
  exit /b 1
)

REM Datenbank-Schema synchronisieren
echo [3/4] Synchronisiere Datenbankschema...
npx prisma db push

REM App starten
echo [4/4] Starte Next.js App auf http://localhost:3000
echo.
echo Zum Beenden: STRG+C druecken (schließt auch den SSH-Tunnel)
echo.
npm run dev
