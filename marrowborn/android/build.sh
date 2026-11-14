#!/usr/bin/env bash
# Builds dist/Marrowborn.apk from ../web (and the relay in ../server/src/com/marrowborn/net) without Gradle.
# Needs a JDK (11+) and the Android SDK: build-tools 34.0.0 and platform android-34.
#   ANDROID_HOME   SDK root (or set BUILD_TOOLS and ANDROID_JAR directly)
#   KEYSTORE       signing keystore; a local one is generated on first run if missing
#   KEYSTORE_PASS  keystore and key password (default: marrowborn), key alias: marrowborn
#   OUT            where the APK goes (default: ../dist/Marrowborn.apk)
set -euo pipefail
cd "$(dirname "$0")"
BT="${BUILD_TOOLS:-${ANDROID_HOME:?set ANDROID_HOME or BUILD_TOOLS}/build-tools/34.0.0}"
AJ="${ANDROID_JAR:-${ANDROID_HOME:?set ANDROID_HOME or ANDROID_JAR}/platforms/android-34/android.jar}"
KS="${KEYSTORE:-marrowborn.keystore}"
PW="${KEYSTORE_PASS:-marrowborn}"
OUT="${OUT:-../dist/Marrowborn.apk}"

rm -rf out assets && mkdir -p out/cls out/dex ../dist
cp -r ../web assets
# the files the in-app server may hand to browsers on the network: only these, by name
(cd assets && find . -type f ! -name '.*' ! -name web.list | sed 's|^\./||' | LC_ALL=C sort) > out/web.list && cp out/web.list assets/web.list
"$BT/aapt2" compile --dir res -o out/res.zip
"$BT/aapt2" link -o out/base.apk -I "$AJ" --manifest AndroidManifest.xml -A assets out/res.zip
# Java 8 class files: the relay is shared with the desktop server (which runs on Java 8+), and d8 34.0.0 fails on the nest-mate
# access that javac emits for inner classes at level 11
javac -nowarn -Xlint:-options -source 8 -target 8 -cp "$AJ" -d out/cls $(find src ../server/src/com/marrowborn/net -name '*.java')
"$BT/d8" --release --min-api 23 --lib "$AJ" --output out/dex $(find out/cls -name '*.class')
(cd out/dex && zip -q -j ../base.apk classes.dex)
"$BT/zipalign" -f 4 out/base.apk out/aligned.apk
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass "$PW" -keypass "$PW" -alias marrowborn \
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Marrowborn"
"$BT/apksigner" sign --ks "$KS" --ks-pass "pass:$PW" --out "$OUT" out/aligned.apk
rm -f "$OUT.idsig"
"$BT/apksigner" verify "$OUT" && echo "Built $OUT"
