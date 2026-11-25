# Ashes to Apex

A top-down arena game. You start as a bare skeleton in a crypt. Each level is one
fight against one monster, and each win gives part of a body back: organs, then skin,
then the five senses one at a time. What you lack is also missing from the screen:
without eyes you see only a small grey circle, without ears sound is muffled, and
without touch your health is hidden.

This folder is self-contained and is not part of the url-shortening Maven build.

The game is one climb up a tower, the Marrowspire. (The folder, file and storage names
still say "marrowborn", the game's working title, so existing installs and saves keep working.)

| Floors | What happens |
|---|---|
| 1 to 8 | The Root. One monster each. You win back organs, skin, touch, sight, hearing, smell and taste, and end up human. |
| 9 to 12 | You choose a class and get its basic equipment and first two skills. Floor 10 is the first guardian, The Flayed King. |
| 13 onward | Generated floors in named bands. Most are short, sharp fights against a monster with modest health that hits hard. About three in ten are trials: survive for a time, guard a lamp, beat a clock, fight under a handicap, or choose a door at a crossroads. Every tenth floor is a guardian with high health and power. Each clear gives an equipment drop and a boon. |
| After 50 | Your class has two upgrades. Alone, an upgrade is earned on the Proving Floor: a short solo floor that asks for what the upgrade does (it can be retried, or left for later). In co-op it is chosen from a menu. |
| After 100 | You choose one of ten apex paths. Five command others: the Tithe (the dead), the Feral Vow (a pack), the Still Winter (frost), the Slow Rot (plague), the Last Pyre (fire). Five make you the weapon: the White Marrow (light), the Split Sky (lightning), the Standing Stone (earth), the Thousandth Cut (blades), the Returning Tide (water). The climb has no end. |

Multiplayer on a local network has two modes: co-op for up to 8 against the tower, and
versus (free-for-all or two teams) where everyone fights with an evenly built hero of a
chosen floor.

For testing, switching on "Checkpoints" in Settings opens every checkpoint, adds a
"Jump to floor" tool to the tower map and pause menu (any floor, with your hero or a
ready-made one), and shows a frame-rate readout.

Clearing every tenth floor unlocks the next floor as a checkpoint, from which a new
climb can start with a ready-made hero. The tower map ("The climb") shows bands,
checkpoints and the floors ahead.

The title screen also offers "Skip to class selection", which starts at level 9, the
Tutorial (a short lesson, skippable step by step) and The bells.

### The fighting (added in 3.7 to 4.2)

- **Strings and closers (3.8).** The basic attack is a string of three to five blows per class; the last, the
  closer, is the heavy one. Blows landed in a row count as a chain, shown on the HUD.
- **Hairbreadth dodge and riposte (3.8).** A dash in the last instant before a blow lands slows the world for a
  moment (alone) or quickens the dodger (multiplayer); the next blow is a riposte.
- **Footing and the last rite (3.8).** The monster of every tenth floor has a footing gauge: emptied, it reels and
  takes more damage. Below 8% health it can be ended with a short last rite, which co-op partners can join (4.1).
- **Setups and payoffs (3.8).** Skills leave monsters aloft, brittle or branded; a matching skill pays the tag off
  for more damage. In co-op a payoff on a partner's setup is worth more (4.1).
- **Dares and marks (3.8).** About one plain floor in three carries an optional dare. Every floor from the ninth
  is marked S to D for time, damage taken and chain; a better mark makes the drop luckier.
- **Dynamic camera (3.8)** with a camera-distance setting, **versus refit (3.9)**, phone layout fixes (3.9).
- **The frame (4.0).** Three stat points per floor in five stats (Sinew, Nerve, Marrow, Breath, Omen); they can be
  placed by hand, taken back at any time, or left even automatically.
- **Alterations (4.0).** Every class skill has three alterations that open as you climb; one is active per skill.
- **Faces of a tyrant (4.0).** Tenth-floor monsters shift at two thirds and one third of their health: a short
  warded beat, then a new attack and a hazard of the floor.
- **Orders for pets (4.0):** attack my target, hold here, fall back, free.
- **Equipment sets, traits and the relic (4.1).** A fourth slot, the relic; four set marks with two- and four-piece
  bonuses; rare traits that change how one skill behaves.
- **Elites, the arena and the land's hazards (4.1).** From floor 15 some lesser monsters carry a modifier of their
  own; pillars break and braziers tip; each land has a hazard on some of its floors.
- **Target lock (4.1)**, on by default on touch, with a Target button and tap-to-target.
- **Co-op raising (4.1):** a downed hero can be raised by a partner standing beside them.
- **The proof (4.2):** the class upgrade is earned on a solo floor, see the table above.
- **Fissures (4.2).** One floor in every ten opens a fissure: an optional side floor with two packs and a keeper,
  a clock and a twist rule. Closed in time it gives a drop that is rare or better and bears a set mark. Open
  fissures are listed on the tower map. Single-player only; never needed to progress.
- **The bells (4.2).** The Daybell rings one floor and the Weekbell three in a row, fixed by the local date with no
  server. They are fought with a ready-made hero in a class of your choice; your climb is not touched. The best
  mark of the day and of the week is kept on the device and shown in Records. Single-player only.
- **The thread (4.2).** At every checkpoint floor a few lines continue the story of the body coming back. They
  appear at the foot of the arena while the fight goes on, can be skipped, and are kept in Records.

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

Bosses from level 9 drop a weapon, armor, trinket or (rarely) a relic for your class in four rarities.
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

The game fills the window at any size and shape, from a phone to an ultrawide or 4K
monitor, and renders at the display's native resolution. Graphics quality has three
tiers (Low, High, Ultra) with a resolution scale and an interface scale.

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
`AshesToApex.bat` on Windows, `AshesToApex.command` on macOS (the first time: right-click, Open), `ashes-to-apex.sh` on Linux.
Double-clicking the jar itself also works where Java is set up for that. Or from a terminal:

    java -jar marrowborn-server.jar [port] [--web DIR] [--no-browser] [--no-window]

It listens on port 7777, or the next free port if that is taken (a port given on the command line is used exactly),
opens `http://localhost:<port>/` in the default browser, and shows a small window with the address and join code for
other devices, who is connected, and a Quit button. Without a display it prints the same to the terminal and runs until
stopped. The game's files are inside the jar; `--web DIR` serves a folder instead.

If Java is missing the launchers say so. Any Java 8 or newer runtime will do, for example from https://adoptium.net/.
Your firewall may ask whether Java may accept connections: allow it on private networks, or other devices cannot join.

### Multiplayer on the local network

Up to eight players, co-op or versus. Everyone must be on the same Wi-Fi or wired network; a phone's own
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
  `extras.js` (settings, records, hints, story), `tower.js` (the tower map and the trial band), `net.js` (multiplayer transport and lobby), plus bundled fonts,
  icons, a web app manifest and three.js.
- `server/` is the relay and desktop launcher in plain Java with no dependencies: `com.marrowborn.net.Relay` forwards
  messages between the players in a room and serves the game's files; the Android app uses the same class.
  `server/build.sh` builds `dist/marrowborn-server.jar` (needs only a JDK).
- `android/` is a thin WebView wrapper that packages `web/` as an app and can run the relay for hosting.
- `ios/` is an Xcode project for a WKWebView wrapper, source only and never built; see `ios/README.md`.
- `dist/` holds the builds: `AshesToApex.apk` is the current Android release (Android 6.0+), the `Marrowborn-*.apk`
  files are earlier releases kept for reference (`Marrowborn-2.0.apk` is the last 2D-only build);
  `marrowborn-server.jar` with its three launchers is the desktop server.

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
