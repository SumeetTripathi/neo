#!/bin/sh
# Marrowborn for macOS: starts the game server and opens the game in your browser.
# Double-click this file (the first time: right-click, Open). It needs marrowborn-server.jar beside it and Java 8 or newer.
cd "$(dirname "$0")" || exit 1
if [ ! -f marrowborn-server.jar ]; then
  echo "marrowborn-server.jar is missing. Keep it in the same folder as this file."
  printf "Press Return to close. "; read _; exit 1
fi
if ! java -version >/dev/null 2>&1; then
  echo "Marrowborn needs Java (version 8 or newer), and none was found on this Mac."
  echo "Install a Java runtime, for example from https://adoptium.net/ , then open this file again."
  printf "Press Return to close. "; read _; exit 1
fi
exec java -jar marrowborn-server.jar "$@"
