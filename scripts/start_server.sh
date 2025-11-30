#!/bin/bash
set -e
systemctl daemon-reload
systemctl start app
systemctl restart nginx
