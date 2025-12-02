
#!/bin/bash
set -xe

if systemctl list-unit-files | grep -q "^nginx.service"; then
  echo "Ensuring nginx is running..."
  if ! systemctl is-active --quiet nginx; then
    sudo systemctl start nginx
  fi
  echo "Reloading nginx..."
  sudo systemctl reload nginx || sudo systemctl restart nginx
else
  echo "nginx not installed, skipping"
fi
