#!/usr/bin/env bash
set -e

MSG="${1:-auto sync infinity-verse and private submodules}"

# 1. Если есть изменения в .private, коммитим и пушим в infinity-verse-private
if [ -d ".private" ]; then
  if [ -n "$(git -C .private status --porcelain)" ]; then
    echo "--- Syncing .private repository ---"
    git -C .private add -A
    git -C .private commit -m "$MSG"
    git -C .private push origin main
  else
    echo "--- .private repository is up to date ---"
  fi
fi

# 2. Коммитим и пушим основной репозиторий infinity-verse
if [ -n "$(git status --porcelain)" ]; then
  echo "--- Syncing main repository ---"
  git add -A
  git commit -m "$MSG"
  git push origin main
else
  echo "--- Main repository is up to date ---"
fi

echo "=== All repositories successfully pushed! ==="
