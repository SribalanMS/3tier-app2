#!/bin/bash
set -xe

cd /opt/app

# Ensure scripts are executable
chmod +x scripts/*.sh || true

# Install dependencies
sudo npm install --production
