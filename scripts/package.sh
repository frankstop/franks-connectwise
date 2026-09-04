#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

version="$(node -p "require('./manifest.json').version")"
release_version="${RELEASE_VERSION:-}"
release_version="${release_version#v}"
if [[ -n "${release_version:-}" && "$version" != "$release_version" ]]; then
  echo "Manifest version $version does not match release $release_version." >&2
  exit 1
fi

node scripts/validate.mjs

stage_dir="dist/stage/Franks-ConnectWise"
archive="dist/Franks-ConnectWise-v${version}.zip"
rm -rf "dist/stage"
mkdir -p "$stage_dir"

files=(
  manifest.json
  background.js
  selector.js
  tab-rename.js
  options.html
  options.css
  options.js
  popup.html
  popup.css
  popup.js
)

cp "${files[@]}" "$stage_dir/"
rm -f "$archive" "$archive.sha256"
(cd "dist/stage" && zip -qr "../$(basename "$archive")" Franks-ConnectWise)
(cd dist && shasum -a 256 "$(basename "$archive")" > "$(basename "$archive").sha256")
rm -rf "dist/stage"

echo "Created $archive and $archive.sha256"
