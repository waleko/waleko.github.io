@ECHO OFF

cd %1

powershell -Command "(gc contact.html) -replace 'contact.js', '/assets/js/contact.js' | Out-File -encoding UTF8 contact.html"
