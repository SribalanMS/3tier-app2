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

# Clean old frontend files (avoid "file already exists" error)
if [ -d /var/www/html ]; then
  echo "Cleaning old frontend files..."
  sudo rm -rf /var/www/html/*
fi

# Clean old backend files (optional, only if you want fresh deploys)
if [ -d /opt/app ]; then
  echo "Cleaning old backend files..."
  sudo rm -rf /opt/app/*
fi

# Recreate directories after cleanup
sudo mkdir -p /opt/app
sudo mkdir -p /var/www/html
sudo mkdir -p /opt/app/scripts

# Backend setup: only run npm install if package.json exists AND npm is installed
if [ -f /opt/app/package.json ]; then
  if command -v npm >/dev/null 2>&1; then
    echo "Installing backend dependencies..."
    cd /opt/app
    npm install --production
  else
    echo "npm not found, skipping backend install (this is fine on Webservers)"
  fi
else
  echo "No backend package.json found, skipping npm install"
fi
