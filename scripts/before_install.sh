#!/bin/bash

set -e
chmod +x /opt/app/scripts/*.sh || true
sudo systemctl stop app || true
sudo systemctl stop nginx || true
cd /opt/
sudo rm -rf app

