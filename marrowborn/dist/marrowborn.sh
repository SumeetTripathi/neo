#!/bin/sh
# Marrowborn for Linux: starts the game server and opens the game in your browser.
# Needs marrowborn-server.jar beside it and Java 8 or newer. Options are passed on (try --help).
cd "$(dirname "$0")" || exit 1
if [ ! -f marrowborn-server.jar ]; then echo "marrowborn-server.jar is missing. Keep it in the same folder as this script." >&2; exit 1; fi
if ! command -v java >/dev/null 2>&1; then
  echo "Marrowborn needs Java (version 8 or newer), and none was found." >&2
  echo "Install a Java runtime with your package manager (for example: sudo apt install default-jre), then run this again." >&2
  exit 1
fi
exec java -jar marrowborn-server.jar "$@"
