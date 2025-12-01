#!/bin/bash
set -xe

# Stop services before deployment
sudo systemctl stop app || true
sudo systemctl stop nginx || true

# Clean old app files but keep node_modules if present
cd /opt/
if [ -d "app" ]; then
  sudo rm -rf app/*
fi
