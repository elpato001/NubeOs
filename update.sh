#!/bin/bash
# NubeOS Update Script - Asynchronous Version

set -e
INSTALL_DIR="/opt/nubeos"
LOG_FILE="$INSTALL_DIR/data/update.log"

# Asegurar que el directorio de datos existe
mkdir -p "$INSTALL_DIR/data"

# Redirigir toda la salida al archivo de log
exec > >(tee -a "$LOG_FILE") 2>&1

echo "--- Iniciando actualización de NubeOS: $(date) ---"
cd $INSTALL_DIR

# 1. Sync with GitHub (Force clean state)
echo "[1/4] Sincronizando con GitHub (Forzando estado limpio)..."
git fetch --all
git reset --hard origin/main
git pull origin main

# 2. Update Backend dependencies
echo "[2/4] Actualizando dependencias del Backend..."
cd $INSTALL_DIR/backend
npm install --omit=dev

# 3. Update Frontend dependencies and rebuild
echo "[3/4] Actualizando dependencias del Frontend..."
cd $INSTALL_DIR/frontend
npm install --include=dev

echo "Construyendo el nuevo Frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo "ERROR: No se pudo generar la carpeta dist tras la construcción."
    exit 1
fi

# 4. Finalize and Restart
echo "[4/4] Actualización completada con éxito. Programando reinicio..."

# Reiniciamos el servicio un par de segundos después para permitir que el script finalice limpiamente
(sleep 5; systemctl restart nubeos) &

echo "Actualización finalizada correctamente a las $(date). El sistema volverá en breve."
