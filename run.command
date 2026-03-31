#!/bin/bash

set -e
cd "$(dirname "$0")"

./run.sh

osascript -e 'tell application "Terminal" to close front window' >/dev/null 2>&1 &
