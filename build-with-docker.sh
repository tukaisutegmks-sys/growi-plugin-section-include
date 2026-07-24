#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")"

sudo docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp/home \
  -v "$PWD:/work" \
  -w /work \
  node:24-bookworm-slim \
  sh -lc '
    mkdir -p "$HOME"
    npx --yes pnpm@10.14.0 install
    npx --yes pnpm@10.14.0 build
  '

echo
echo "Build completed: $PWD/dist"
