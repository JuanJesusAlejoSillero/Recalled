#!/bin/sh

# Script para inyectar variables de entorno en runtime
# para aplicaciones React servidas por Nginx

# Ruta al archivo JavaScript de configuración
CONFIG_FILE="/usr/share/nginx/html/env-config.js"

# Crear archivo de configuración con variables de entorno
cat <<EOF > $CONFIG_FILE
window.ENV = {
  VITE_API_URL: "${VITE_API_URL:-/api/v1}",
};
EOF

echo "Variables de entorno configuradas:"
cat $CONFIG_FILE

# Importante: este script se ejecuta antes de que Nginx inicie
# gracias a que está en /docker-entrypoint.d/
