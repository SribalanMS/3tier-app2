#!/bin/bash
set -xe
sudo systemctl daemon-reload
sudo systemctl start nginx
sudo systemctl restart app
