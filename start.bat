@echo off
cls


:reboot_backend
echo Running Backend...
;node build\index.js
goto reboot_backend

echo Both scripts started successfully.
