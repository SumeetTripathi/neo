# Marrowborn

A top-down arena game. You start as a bare skeleton in a crypt. Each level is one
fight against one monster, and each win gives part of a body back: organs, then skin,
then the five senses one at a time. What you lack is also missing from the screen:
without eyes you see only a small grey circle, without ears sound is muffled, and
without touch your health is hidden.

This folder is self-contained and is not part of the url-shortening Maven build.

| Level | Monster | Reward |
|---|---|---|
| 1 Bare Bones | Gravecrawler | Organs (more health, dash) |
| 2 A Beating Heart | Bonehound | Skin (more health, slow healing) |
| 3 Thin Skin | Tallow Witch | Touch (health bar, attack warnings) |
| 4 First Touch | Gravel Fist | Sight (full view, colour) |
| 5 Open Eyes | Brood Mother | Hearing (clear sound, hear burrowing) |
| 6 Listening | The Burrower | Smell (tell the real Mimic from copies) |
| 7 Scent | The Mimic | Taste (eat morsels to heal) |
| 8 Whole | The Hollow | You are human |

## Layout

- `web/` is the whole game: one `index.html` (canvas, no libraries) plus bundled fonts.
- `android/` is a thin WebView wrapper that packages `web/` as an app.
- `dist/Marrowborn.apk` is a prebuilt, installable APK (Android 6.0+).

## Play in a browser

Open `web/index.html`. WASD or arrows to move, Space or click to strike, Shift to dash
(after level 1). On a touch screen there is a thumb stick with Strike and Dash buttons.
Progress is saved in the browser.

## Build the Android app

Needs a JDK and the Android SDK (build-tools 34.0.0, platform android-34). No Gradle.

    ANDROID_HOME=/path/to/sdk ./android/build.sh

The script copies `web/` into the app, compiles, signs and writes `dist/Marrowborn.apk`.
If no keystore is given it generates `android/marrowborn.keystore` on first run.
Keystores are ignored by git. Android only installs an update over an existing app when
both are signed with the same key, so keep your keystore somewhere safe and pass it with
`KEYSTORE=... KEYSTORE_PASS=...`.

The app ID is `com.marrowborn.game` (see `android/AndroidManifest.xml`).

## Credits

Fonts: Pirata One and Spectral, both under the SIL Open Font License.
