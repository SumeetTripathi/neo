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
| 9 to 12 | You choose a class and get its basic equipment and first two skills. Level 12 is the Flayed King. |
| 13 onward | Generated levels across five areas: scaling monsters with modifiers, rooms with pillars, pits and traps, waves before some bosses, and a three-phase tyrant every tenth level. Each clear gives an equipment drop and a boon. |
| After 50 | You choose one of two upgrades for your class. The levels continue without end. |

The title screen also offers "Skip to class selection", which starts at level 9.

Classes follow the usual hunter archetypes. Each has ten active skills with their own
cooldowns, of which four are carried at a time (keys 1 to 4, or four touch buttons).

| Class | Plays as | Upgrades after level 50 |
|---|---|---|
| Fighter | Fast greatsword, no defence | Champion, Duelist |
| Tank | Sword and a shield that blocks hits | Paladin, Berserker |
| Assassin | Twin daggers, short dash cooldown, triple hit after a dash | Nightblade, Phantom |
| Mage | Ranged bolts, blink instead of dash | Archmage, Pyromancer |
| Ranger | Fast long-range arrows | Sharpshooter, Beastmaster |
| Healer | Ranged light orbs, steady self-healing | Saint, Inquisitor |
| Necromancer | Bone spears and skeleton thralls that fight for you | Lich, Reaper |

Bosses from level 9 drop a weapon, armor or trinket for your class in four rarities.
You can melt the drop into your current item to upgrade it, replace the current item,
or destroy the drop for a small permanent bonus.

Rendering is 3D (three.js, bundled in `web/vendor/`) with an automatic fallback to the
original 2D canvas renderer when WebGL is unavailable. Settings cover music and effects
volume, haptic strength, button size, a left-handed layout and a low-graphics mode.
Runs can be exported and imported as a text code.

## Layout

- `web/` is the whole game, as plain script files with no build step:
  `game.js` (rules), `render3d.js` (3D scene), `models-player.js`, `models-monsters.js`,
  `extras.js` (settings, records, hints, story), plus bundled fonts and three.js.
- `android/` is a thin WebView wrapper that packages `web/` as an app.
- `dist/Marrowborn.apk` is a prebuilt, installable APK (Android 6.0+). `Marrowborn-2.0.apk`
  is the last 2D-only build.

## Play in a browser

Open `web/index.html`. WASD or arrows to move, Space or click to strike, Shift to dash
(after level 1), 1 to 4 for class skills, Esc to pause. On a touch screen there is a thumb stick with Strike and Dash buttons.
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
