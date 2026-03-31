#!/bin/bash
# SBI証券 → Google Sheets 同期スクリプト
# 使い方:
#   ./run.sh          # 通常実行
#   ./run.sh --setup  # 初回セットアップ（ブラウザ表示・2段階認証）

set -e
cd "$(dirname "$0")"

node -r ts-node/register/transpile-only src/index.ts "$@"
