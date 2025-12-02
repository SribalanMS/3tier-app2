#!/bin/bash
set -xe

# Reload nginx to pick up new frontend files
if systemctl list-unit-files | grep -q nginx.service; then
  sudo systemctl reload nginx
else
  echo "nginx service not found, skipping reload"
fi
