#!/bin/sh
# New version number on every file of the dashboard: browsers (Safari above all) keep old scripts and styles in
# memory, a new address forces them to download the new ones. Run it before publishing a change to jobscout/.
set -e
cd "$(dirname "$0")"
V=$(date -u +%Y%m%d%H%M)
for f in *.html; do
  sed -i.bak -E 's#(href|src)="([a-z0-9-]+\.(css|js))(\?v=[0-9]+)?"#\1="\2?v='"$V"'"#g' "$f"
done
for f in *.js; do
  sed -i.bak -E 's#(from |import\()"(\./[a-z0-9-]+\.js)(\?v=[0-9]+)?"#\1"\2?v='"$V"'"#g' "$f"
done
rm -f ./*.bak
echo "versione $V"
