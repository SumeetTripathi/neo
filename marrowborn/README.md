# Marrowborn

A top-down arena game. You start as a bare skeleton in a crypt. Each level is one
fight against one monster, and each win gives part of a body back: organs, then skin,
then the five senses one at a time. What you lack is also missing from the screen:
without eyes you see only a small grey circle, without ears sound is muffled, and
without touch your health is hidden.

This folder is self-contained and is not part of the url-shortening Maven build.

| Levels | What happens |
|---|---|
| 1 to 8 | One monster each. You win back organs, skin, touch, sight, hearing, smell and taste, and end up human. Level 8 is The Hollow. |
| 9 to 12 | You choose a class and get its basic equipment and first two skills. Level 10 is the first boss, The Flayed King. |
| 13 onward | Generated levels across five areas. Ordinary levels are short, sharp fights against a monster with modest health that hits hard, in rooms with pillars, pits and traps, sometimes after a wave. Every tenth level is a boss: a three-phase tyrant with high health and power. Each clear gives an equipment drop and a boon. |
| After 50 | You choose one of two upgrades for your class. The levels continue without end. |

The title screen also offers "Skip to class selection", which starts at level 9.

Classes follow the usual hunter archetypes. Each has ten active skills with their own
cooldowns, of which six are carried at a time (keys 1 to 6, or six touch buttons).

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

Skills cost mana as well as having cooldowns. Mana refills on its own, faster while
you stand still, and the pool has no upper limit: it grows with every level cleared,
with the Wellspring boon and with equipment.

Every class can also claim something from a boss it kills. The Necromancer binds the
monster as a pet and the Ranger's Beastmaster upgrade tames it. A bound pet fights as the
monster it was: same attacks, enrage, modifiers and strength. There is no limit on
pets held or deployed: each deployed pet holds back mana in proportion to its power,
and a fallen pet revives by spending mana. The other classes take a trophy that replays the boss's
attack: a technique (Fighter), ward (Tank), venom (Assassin), familiar (Mage),
arrowhead (Ranger before the upgrade) or guardian (Healer).

Rendering is cel-shaded 3D (three.js, bundled in `web/vendor/`) with an automatic fallback to the
original 2D canvas renderer when WebGL is unavailable. Settings cover music and effects
volume, haptic strength, button size, a left-handed layout and a low-graphics mode.
Runs can be exported and imported as a text code.

## Platforms

| Platform | How to play | Multiplayer |
|---|---|---|
| Android 6.0+ | Install the APK from `dist/` | Host or join |
| Windows, macOS, Linux | Run the server (`dist/marrowborn-server.jar`, needs Java 8 or newer); it opens the game in your browser | Host or join |
| iPhone, iPad | Open the host's address in Safari, or build the wrapper app in `ios/` yourself | Join only |
| Any other device with a current browser | Open the host's address | Join; hosts rooms on a computer's server |

Single-player works everywhere, and also straight from `web/index.html` without any server.

### On a computer (Windows, macOS, Linux)

Keep `marrowborn-server.jar` and the launcher for your system in the same folder, then double-click the launcher:
`Marrowborn.bat` on Windows, `Marrowborn.command` on macOS (the first time: right-click, Open), `marrowborn.sh` on Linux.
Double-clicking the jar itself also works where Java is set up for that. Or from a terminal:

    java -jar marrowborn-server.jar [port] [--web DIR] [--no-browser] [--no-window]

It listens on port 7777, or the next free port if that is taken (a port given on the command line is used exactly),
opens `http://localhost:<port>/` in the default browser, and shows a small window with the address and join code for
other devices, who is connected, and a Quit button. Without a display it prints the same to the terminal and runs until
stopped. The game's files are inside the jar; `--web DIR` serves a folder instead.

If Java is missing the launchers say so. Any Java 8 or newer runtime will do, for example from https://adoptium.net/.
Your firewall may ask whether Java may accept connections: allow it on private networks, or other devices cannot join.

### Multiplayer on the local network

Up to eight players, co-op (versus is planned). Everyone must be on the same Wi-Fi or wired network; a phone's own
hotspot counts. Nothing leaves the local network and no account or internet connection is needed.

- **Host on an Android phone:** Multiplayer, then "Host on this phone". The lobby shows a join code and an address.
- **Host on a computer:** start the server as above, choose Multiplayer in the page it opens, then "Create a room".
- **Join from the Android app:** Multiplayer, "Join a game", and type the host's join code or address.
- **Join from a browser** (iPhone, iPad, Mac, PC, another phone): open the address the host shows, for example
  `http://192.168.1.20:7777/`. The page comes from the host itself, so nothing needs installing. Choose Multiplayer
  and join the room listed there. On an iPhone, Share then "Add to Home Screen" gives it an icon and a full screen.

The host presses Start when everyone is ready. If the host leaves or loses the connection the session ends for all.
Nobody can join a game that has already started. On Android the game stops while the app is in the background, so the
host should keep it open.

A join code is only the host's address in a shorter spelling (digits and capital letters without I, L, O and U):
4 characters for `192.168.x.y`, 6 for the other private ranges, both on port 7777, and 11 for any other address or port.
The last character or bits are a check against typing mistakes.

**Trusted networks only.** The server listens on every network interface of the machine it runs on and has no
passwords and no encryption: anyone who can reach its port can open the game and join or create a room. Use it at home
or with friends, not on public Wi-Fi. It serves nothing but the game's own files, and refuses pages from the internet
that try to open a socket to it. An Android phone runs its server only while it is hosting a lobby or game.

Limits of the relay: 8 players per room, 32 rooms per computer server (one on a phone), 1 MiB per message, and for
each player at most 400 messages or 4 MiB per second in, and 1024 messages or 8 MiB waiting to go out. A player whose
connection cannot keep up is disconnected rather than allowed to hold the others back.

### What has been tested

Tested here, on Linux with headless Chromium: the game and lobby in the browser from the server; hosting, joining by
code and by address, ready, start, leaving, removing a player and the host disappearing; eight players exchanging
fifteen 8 KB messages a second for a minute through the jar without loss; malformed and oversized traffic, slow and
vanished clients; that only the game's files are served; the jar picking a free port; the status window on a virtual display.

Not tested, because no such device or system was available: the Android app on a phone or emulator (it compiles and
the APK is built and signed; the server inside it is the same code as the tested jar); Windows and macOS (the jar is
plain Java; the two launchers were written but never run); Safari on macOS and iOS and Firefox (the page was reviewed
for features they lack, not run in them); the iOS wrapper in `ios/`, which has never been compiled; real Wi-Fi with
several devices.

## Layout

- `web/` is the whole game, as plain script files with no build step:
  `game.js` (rules), `render3d.js` (3D scene), `models-player.js`, `models-monsters.js`,
  `extras.js` (settings, records, hints, story), `net.js` (multiplayer transport and lobby), plus bundled fonts,
  icons, a web app manifest and three.js.
- `server/` is the relay and desktop launcher in plain Java with no dependencies: `com.marrowborn.net.Relay` forwards
  messages between the players in a room and serves the game's files; the Android app uses the same class.
  `server/build.sh` builds `dist/marrowborn-server.jar` (needs only a JDK).
- `android/` is a thin WebView wrapper that packages `web/` as an app and can run the relay for hosting.
- `ios/` is an Xcode project for a WKWebView wrapper, source only and never built; see `ios/README.md`.
- `dist/` holds the builds: `Marrowborn.apk` is the current single-player release (3.3) and `Marrowborn-3.4-mp1.apk`
  the first multiplayer build, both for Android 6.0+; `Marrowborn-3.2.apk` is the previous release and
  `Marrowborn-2.0.apk` the last 2D-only build; `marrowborn-server.jar` with its three launchers is the desktop server.

## Play in a browser

Open `web/index.html`, or run the server and use the page it opens. WASD or arrows to move, Space or click to strike, Shift to dash
(after level 1), 1 to 6 for class skills, Esc to pause. On a touch screen there is a thumb stick with Strike and Dash buttons.
Progress is saved in the browser, separately for each address the game is opened from.

## Build the Android app

Needs a JDK and the Android SDK (build-tools 34.0.0, platform android-34). No Gradle.

    ANDROID_HOME=/path/to/sdk ./android/build.sh

The script copies `web/` into the app, compiles it together with the relay from `server/src`, signs and writes
`dist/Marrowborn.apk` (set `OUT=...` for another name).
If no keystore is given it generates `android/marrowborn.keystore` on first run.
Keystores are ignored by git. Android only installs an update over an existing app when
both are signed with the same key, so keep your keystore somewhere safe and pass it with
`KEYSTORE=... KEYSTORE_PASS=...`.

The app ID is `com.marrowborn.game` (see `android/AndroidManifest.xml`). For multiplayer the app asks for network
access (`INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`) and allows unencrypted connections, because
devices on a local network have no certificates. It makes no connection until you host or join a game.

## Build the desktop server

    ./server/build.sh

Needs only a JDK. It compiles for Java 8 and packs `web/` into `dist/marrowborn-server.jar`.

## Credits

Fonts: Rajdhani and Barlow, both under the SIL Open Font License. three.js is MIT licensed.
