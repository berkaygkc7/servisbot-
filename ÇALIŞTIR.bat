@echo off
title ServisBot Baslatici
echo =========================================
echo       SERVISBOT BASLATILIYOR...
echo =========================================
echo.
timeout /t 2 >nul
start http://localhost:5173
npm run dev
