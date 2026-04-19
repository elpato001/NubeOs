#!/bin/bash

# Configuration
LOG_FILE="data/update.log"
FRONTEND_DIR="frontend"

# Ensure log directory exists
mkdir -p data

echo "--- Update started at $(date) ---" | tee -a $LOG_FILE

# 1. Limpieza profunda y actualización de código
echo "Realizando limpieza profunda y descargando cambios..." | tee -a $LOG_FILE
git fetch origin main
git reset --hard origin/main
git clean -fd | tee -a $LOG_FILE

# 2. Update dependencies
echo "Actualizando dependencias..." | tee -a $LOG_FILE
composer install --no-interaction --prefer-dist --optimize-autoloader | tee -a $LOG_FILE
cd $FRONTEND_DIR
npm install | tee -a $LOG_FILE

# 3. Build frontend
echo "Compilando frontend..." | tee -a $LOG_FILE
rm -rf dist
npm run build | tee -a $LOG_FILE

# 4. Finalize
cd ..
php artisan migrate --force | tee -a $LOG_FILE
php artisan config:cache | tee -a $LOG_FILE
php artisan route:cache | tee -a $LOG_FILE

echo "--- Update finished successfully at $(date) ---" | tee -a $LOG_FILE
