#!/bin/bash
set -e
curl -sf http://localhost/health || exit 1
