#!/bin/bash
# Doble clic para abrir Brainacho en Mac.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js. Instalalo desde https://nodejs.org (versión LTS) y volvé a abrir este archivo."
  read -n 1 -s -r -p "Tocá una tecla para cerrar…"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Primera vez: instalando dependencias (unos minutos)…"
  npm install || { read -n 1 -s -r -p "Falló la instalación. Tocá una tecla para cerrar…"; exit 1; }
fi

npm start
