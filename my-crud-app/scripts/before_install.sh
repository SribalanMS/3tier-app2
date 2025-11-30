#!/bin/bash
set -e
systemctl stop app || true
systemctl stop nginx || true
