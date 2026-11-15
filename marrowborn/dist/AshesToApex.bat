@echo off
rem Ashes to Apex for Windows: starts the game server and opens the game in your browser.
rem Double-click this file. It needs marrowborn-server.jar beside it and Java 8 or newer.
title Ashes to Apex server
cd /d "%~dp0"
if not exist "marrowborn-server.jar" (
  echo marrowborn-server.jar is missing. Keep it in the same folder as this file.
  pause
  exit /b 1
)
where java >nul 2>nul
if errorlevel 1 (
  echo Ashes to Apex needs Java ^(version 8 or newer^), and none was found on this PC.
  echo Install a Java runtime, for example from https://adoptium.net/ , then open this file again.
  pause
  exit /b 1
)
java -jar "marrowborn-server.jar" %*
if errorlevel 1 pause
