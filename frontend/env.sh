#!/bin/sh

# Script used to inject runtime environment variables
# for React applications served by Nginx

# Path to the generated JavaScript config file
CONFIG_FILE="/usr/share/nginx/html/env-config.js"

# Generate the config file with environment variables
cat <<EOF > $CONFIG_FILE
window.ENV = {
  VITE_API_URL: "${VITE_API_URL:-/api/v1}",
  ENABLE_MAP: "${ENABLE_MAP:-false}",
};
EOF

echo "Variables de entorno configuradas:"
cat $CONFIG_FILE

# Important: this script runs before Nginx starts
# because it lives in /docker-entrypoint.d/
