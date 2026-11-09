#!/usr/bin/env bash
set -e

# Configuration
REPO_DIR="/path/to/your/git/repo"
PORT="8080" # Port where your HTTP seed / file server is running locally
IP_JSON="$REPO_DIR/ip.json"

cd "$REPO_DIR"

# Fetch current public IP using a reliable external service
CURRENT_IP=$(curl -s https://api.ipify.org)

if [ -z "$CURRENT_IP" ]; then
  echo "Error: Failed to fetch public IP."
  exit 1
fi

# Read previous IP from ip.json using python or grep/jq
PREV_IP=$(node -p "require('./ip.json').ip" 2>/dev/null || echo "")

if [ "$CURRENT_IP" = "$PREV_IP" ]; then
  echo "IP address unchanged ($CURRENT_IP). Exiting."
  exit 0
fi

echo "IP address changed from '$PREV_IP' to '$CURRENT_IP'. Updating repository..."

# Update ip.json using a quick node snippet or jq
node -e "
const fs = require('fs');
const file = './ip.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.ip = '$CURRENT_IP';
data.port = $PORT;
data.updated_at = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(data, null, 2));
"

# Git commit and push
git add ip.json
git commit -m "Auto-update dynamic IP seed: $CURRENT_IP"
git push origin main

echo "Successfully updated and pushed new IP address to GitHub Pages."