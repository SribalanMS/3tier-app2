#!/bin/bash
set -e
chmod +x /opt/app/scripts/*.sh
sudo systemctl stop app || true
sudo systemctl stop nginx || true
