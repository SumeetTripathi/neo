#!/usr/bin/env bash
# Builds dist/marrowborn-server.jar: the relay, the desktop launcher and a copy of ../web inside one jar.
# Needs only a JDK (8 or newer; the classes are compiled for Java 8 so the jar runs on any Java 8+ runtime).
set -euo pipefail
cd "$(dirname "$0")"
rm -rf out && mkdir -p out/cls ../dist
if javac --release 8 -version >/dev/null 2>&1; then REL="--release 8"; else REL="-source 8 -target 8"; fi
javac -nowarn -Xlint:-options $REL -encoding UTF-8 -d out/cls $(find src -name '*.java')
mkdir -p out/cls/web && cp -r ../web/. out/cls/web/
# the list of files the server may hand out: nothing outside it is served, whatever is asked for
(cd out/cls/web && find . -type f ! -name '.*' | sed 's|^\./||' | LC_ALL=C sort) > out/cls/web.list
printf 'Main-Class: com.marrowborn.server.Main\nImplementation-Title: Marrowborn server\n' > out/manifest.txt
jar cfm ../dist/marrowborn-server.jar out/manifest.txt -C out/cls .
echo "Built dist/marrowborn-server.jar ($(wc -l < out/cls/web.list) game files inside)"
