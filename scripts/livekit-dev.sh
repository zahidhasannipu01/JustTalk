#!/usr/bin/env bash
# Runs a local LiveKit server for development (open source, self-hosted).
set -e
cd "$(dirname "$0")/.."
BIN="./livekit/livekit-server"
if [ ! -x "$BIN" ]; then
  mkdir -p livekit
  echo "Downloading LiveKit server (linux amd64)…"
  curl -sL -o /tmp/livekit.tar.gz "https://github.com/livekit/livekit/releases/download/v1.8.4/livekit_1.8.4_linux_amd64.tar.gz" || { echo "Download failed — get the binary from https://github.com/livekit/livekit/releases and place it at livekit/livekit-server"; exit 1; }
  tar -xzf /tmp/livekit.tar.gz -C livekit
fi
exec "$BIN" --config livekit.yaml --dev --bind 0.0.0.0
