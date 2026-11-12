@echo off
title Mandi Dost - App (scan the QR code with Expo Go)
echo Starting the Mandi Dost app. A QR code will appear below.
echo Open Expo Go on your phone and scan it. Keep this window open.
echo.
cd /d "%~dp0"
call npx expo start
pause
