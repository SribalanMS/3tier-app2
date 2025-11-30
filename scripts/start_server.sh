#!/bin/bash
set -e
sudo systemctl daemon-reload
sudo systemctl start app
sudo systemctl restart nginx
