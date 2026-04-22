@echo off
SET "MYMEDIA_DIR=%~dp0MyMediaServer"
echo 🚀 Iniciando instalacion de MyMediaServer para Windows...

if not exist "%MYMEDIA_DIR%" (
    echo 📦 Clonando repositorio...
    git clone https://github.com/pepitozoe79-lgtm/MyMediaServer.git "%MYMEDIA_DIR%"
)

cd /d "%MYMEDIA_DIR%"

echo 📚 Instalando dependencias...
call npm install

echo ⚙️ Configurando puerto 3001...
SET PORT=3001

echo 🎉 Iniciando MyMediaServer en el puerto 3001...
echo (Puedes cerrar esta ventana, pero la aplicacion se detendra)
node server.js
pause
