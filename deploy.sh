#!/bin/bash
set -x   # mostrar cada comando ejecutado

cd /home/juego || exit
echo "Directorio actual: $(pwd)"
echo "Usuario: $(whoami)"
echo "Branch actual: $(git branch --show-current)"
git pull origin main
npm install --production
pm2 restart juego || pm2 start index.js --name juego
echo "Despliegue completado"
