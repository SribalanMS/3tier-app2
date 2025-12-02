#!/bin/bash
set -xe
sudo systemctl daemon-reload

# Restart Node.js app if service exists (App servers)
if systemctl list-unit-files | grep -q app.service; then
  echo "Restarting Node.js app service..."
  sudo systemctl restart app
fi

# Start or reload nginx if service exists (Web servers)
if systemctl list-unit-files | grep -q nginx.service; then
  echo "Starting nginx..."
  sudo systemctl start nginx
  sudo systemctl reload nginx
fi
