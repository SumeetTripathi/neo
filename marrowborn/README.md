# Marrowborn

A top-down arena game. You start as a bare skeleton in a crypt. Each level is one
fight against one monster, and each win gives part of a body back: organs, then skin,
then the five senses one at a time. What you lack is also missing from the screen:
without eyes you see only a small grey circle, without ears sound is muffled, and
without touch your health is hidden.

This folder is self-contained and is not part of the url-shortening Maven build.

| Levels | What happens |
|---|---|
| 1 to 8 | One monster each. You win back organs, skin, touch, sight, hearing, smell and taste, and end up human. |
| 9 to 11 | You choose a class and get its basic equipment. Each level adds one class power; the second is an active skill. |
| 12 | The Flayed King. |
| 13 to 50 | Generated levels with scaling monsters and a tyrant every tenth level. Each clear offers a choice of three boons. |
| After 50 | You choose one of two upgrades for your class, then the levels continue without end. |

Classes follow the usual hunter archetypes:

| Class | Plays as | Upgrades after level 50 |
|---|---|---|
| Fighter | Fast greatsword, no defence | Champion, Duelist |
| Tank | Sword and a shield that blocks hits | Paladin, Berserker |
| Assassin | Twin daggers, short dash cooldown, triple hit after a dash | Nightblade, Phantom |
| Mage | Ranged bolts, blink instead of dash | Archmage, Pyromancer |
| Ranger | Fast long-range arrows | Sharpshooter, Beastmaster |
| Healer | Ranged light orbs, steady self-healing | Saint, Inquisitor |
| Necromancer | Bone spears and skeleton thralls that fight for you | Lich, Reaper |

Sound is synthesised in the page (muffled until you win your ears). Haptics use the
phone's vibration motor; both can be switched off in the game.

## Layout

- `web/` is the whole game: one `index.html` (canvas, no libraries) plus bundled fonts.
- `android/` is a thin WebView wrapper that packages `web/` as an app.
- `dist/Marrowborn.apk` is a prebuilt, installable APK (Android 6.0+).

## Play in a browser

Open `web/index.html`. WASD or arrows to move, Space or click to strike, Shift to dash
(after level 1), E for the class skill. On a touch screen there is a thumb stick with Strike and Dash buttons.
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
