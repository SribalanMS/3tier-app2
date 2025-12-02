#!/bin/bash
set -xe

# Ensure directories exist
sudo mkdir -p /opt/app
sudo mkdir -p /var/www/html
sudo mkdir -p /opt/app/scripts

# Make scripts executable if they exist
if [ -d /opt/app/scripts ]; then
  sudo chmod +x /opt/app/scripts/*.sh || true
fi

# Only run npm install if backend exists AND npm is installed
if [ -f /opt/app/package.json ]; then
  if command -v npm >/dev/null 2>&1; then
    echo "Installing backend dependencies..."
    cd /opt/app
    sudo npm install --production
  else
    echo "npm not found, skipping backend install"
  fi
else
  echo "No backend package.json found, skipping npm install"
fi
