#!/usr/bin/env bash
# Deploy the Caderno Digital build to GitHub Pages (source = gh-pages branch).
# Usage: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "→ Building (npm run build)..."
npm run build

echo "→ Switching to gh-pages branch..."
git checkout -B gh-pages main

echo "→ Keeping only build output (index.html + assets/)..."
git rm -rf --cached . >/dev/null 2>&1 || true
rm -rf src data 2>/dev/null || true
rm -f package.json package-lock.json tsconfig.json tsconfig.node.json \
      vite.config.ts tailwind.config.js postcss.config.js .gitignore index.html 2>/dev/null || true
cp dist/index.html ./index.html
cp -r dist/assets ./assets
rm -rf dist 2>/dev/null || true

echo "→ Committing and pushing to origin/gh-pages..."
git add index.html assets
git commit -m "Deploy: $(git rev-parse --short main)" || echo "Nothing new to deploy."
git push -f origin gh-pages

echo "→ Done! Live at https://cssr.github.io/caderno-digital-investigacao/"
