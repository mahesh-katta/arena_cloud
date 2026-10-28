#!/bin/bash
# Double-click to run Arena Dashboard on http://localhost:8123
export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")"
# stop an older copy of the server still holding the port, so the newest code always runs
OLD=$(lsof -ti tcp:8123 2>/dev/null)
[ -n "$OLD" ] && kill $OLD 2>/dev/null && sleep 1
open http://localhost:8123 >/dev/null 2>&1 &
exec node server.mjs 8123
