#!/usr/bin/env bash
set -euo pipefail

destination=${1:?destination required}
test -d "$destination"

find "$destination" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp index.html foldkernel-integration.json robots.txt sitemap.xml "$destination/"
cp -R Brand Mint Output Web "$destination/"
