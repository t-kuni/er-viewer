#!/bin/sh

GIT_DIR="$(git rev-parse --git-dir 2>/dev/null)" || exit 0

case "$GIT_DIR" in
  */worktrees/*)
    WT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 1
    cd "$WT_ROOT" || exit 1

    if [ ! -d node_modules ]; then
      npm install >/dev/null 2>&1 || exit 1
    fi

    if [ ! -d public/node_modules ]; then
      (cd public && npm install) >/dev/null 2>&1 || exit 1
    fi

    npm run generate >/dev/null 2>&1 || exit 1

    echo "worktreeを初期セットアップが完了しました"
    ;;
  *)
    echo "worktreeではないのでスキップしました"
    ;;
esac
