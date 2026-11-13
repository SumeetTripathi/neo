#!/usr/bin/env bash
# Builds dist/Marrowborn.apk from ../web without Gradle.
# Needs a JDK (11+) and the Android SDK: build-tools 34.0.0 and platform android-34.
#   ANDROID_HOME   SDK root (or set BUILD_TOOLS and ANDROID_JAR directly)
#   KEYSTORE       signing keystore; a local one is generated on first run if missing
#   KEYSTORE_PASS  keystore and key password (default: marrowborn), key alias: marrowborn
set -euo pipefail
cd "$(dirname "$0")"
BT="${BUILD_TOOLS:-${ANDROID_HOME:?set ANDROID_HOME or BUILD_TOOLS}/build-tools/34.0.0}"
AJ="${ANDROID_JAR:-${ANDROID_HOME:?set ANDROID_HOME or ANDROID_JAR}/platforms/android-34/android.jar}"
KS="${KEYSTORE:-marrowborn.keystore}"
PW="${KEYSTORE_PASS:-marrowborn}"

rm -rf out assets && mkdir -p out/cls out/dex ../dist
cp -r ../web assets
"$BT/aapt2" compile --dir res -o out/res.zip
"$BT/aapt2" link -o out/base.apk -I "$AJ" --manifest AndroidManifest.xml -A assets out/res.zip
javac -nowarn -source 11 -target 11 -cp "$AJ" -d out/cls $(find src -name '*.java')
"$BT/d8" --release --min-api 23 --lib "$AJ" --output out/dex $(find out/cls -name '*.class')
(cd out/dex && zip -q -j ../base.apk classes.dex)
"$BT/zipalign" -f 4 out/base.apk out/aligned.apk
[ -f "$KS" ] || keytool -genkeypair -keystore "$KS" -storepass "$PW" -keypass "$PW" -alias marrowborn \
  -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Marrowborn"
"$BT/apksigner" sign --ks "$KS" --ks-pass "pass:$PW" --out ../dist/Marrowborn.apk out/aligned.apk
rm -f ../dist/Marrowborn.apk.idsig
"$BT/apksigner" verify ../dist/Marrowborn.apk && echo "Built dist/Marrowborn.apk"
