@echo off
title Unified Dev Environment Starter

:: 1. Start XAMPP Services (Apache and MySQL)
echo Starting XAMPP Services...
:: Change the path below if XAMPP is installed elsewhere
cd /d "E:\xammp"
start "" "xampp_start.exe"

:: Give XAMPP a moment to initialize ports
timeout /t 5 /nobreak

:: 2. Open the E-Voting Link
echo Opening E-Voting System...
start "" "http://localhost/WCIS E-Voting"