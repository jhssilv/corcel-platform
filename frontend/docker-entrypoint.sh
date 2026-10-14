#!/bin/sh
set -e

TEMPLATE_FILE="/etc/nginx/nginx.conf.template"
CONFIG_FILE="/etc/nginx/nginx.conf"

cp "$TEMPLATE_FILE" "$CONFIG_FILE"

if [ -n "$SERVER_NAME" ] && [ "$SERVER_NAME" != "_" ]; then
    echo "Configuring Nginx for SERVER_NAME='$SERVER_NAME' (dropping direct IP scans with HTTP 444)..."
    sed -i "s|__DEFAULT_SERVER_BLOCK__|server { listen 80 default_server; listen 443 ssl default_server; ssl_certificate /etc/nginx/certs/cert.pem; ssl_certificate_key /etc/nginx/certs/key.pem; server_name _; return 444; }|g" "$CONFIG_FILE"
    sed -i "s|__SERVER_NAME__|$SERVER_NAME|g" "$CONFIG_FILE"
else
    echo "SERVER_NAME is not set. Nginx will accept all incoming hostnames and direct IP access."
    sed -i "s|__DEFAULT_SERVER_BLOCK__||g" "$CONFIG_FILE"
    sed -i "s|__SERVER_NAME__|_|g" "$CONFIG_FILE"
fi

exec nginx -g "daemon off;"
