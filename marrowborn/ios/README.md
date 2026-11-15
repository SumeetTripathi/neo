# Ashes to Apex for iPhone and iPad (source only)

This folder is an Xcode project that wraps the web game (`../web`) in a full-screen web view.

**It has never been compiled or run.** It was written on a machine with no Mac, no Xcode and no iOS device, so treat it
as a starting point: the Swift sources and the project file were checked by reading only. If Xcode reports a problem with
the project file, the fallback at the end of this page takes five minutes.

You do not need this app to play on an iPhone. Safari is enough: open the address the host shows
(`http://<host address>:7777/`) and, if you like, use Share, then Add to Home Screen. The app only adds an icon without
that step, haptics, and play without a server for single-player.

## What it can and cannot do

- Single-player works offline from the files inside the app.
- Multiplayer: it can **join** a game hosted by an Android phone or by the Ashes to Apex server on a computer (Multiplayer,
  Join a game, then the host's join code or address). It **cannot host**; the lobby hides that button here.
- The first time it connects to a host, iOS asks for permission to find devices on the local network. Say yes; if it was
  refused, turn it on under Settings, Privacy & Security, Local Network.

## Build and run

Needs a Mac with Xcode 14 or newer and an Apple ID (a free one will do for your own device).

1. Open `ios/Marrowborn.xcodeproj` in Xcode.
2. Select the `Marrowborn` project in the navigator, then the `Marrowborn` target, then Signing & Capabilities.
   Tick "Automatically manage signing" and choose your Team. If Xcode says the bundle identifier is taken, change
   `com.marrowborn.game` to something of your own, such as `com.yourname.marrowborn`.
3. Check that `web` appears in the navigator as a blue folder (a folder reference to `../web`) and is listed under
   Build Phases, Copy Bundle Resources. If it is missing or red: delete the entry, drag the repository's `web` folder
   into the navigator, and choose "Create folder references" with the `Marrowborn` target ticked. Do not choose
   "Create groups": the page expects its files in a folder named `web` inside the app.
4. Plug in the iPhone or iPad, pick it as the run destination and press Run. On a free account, the first launch needs
   your approval on the device under Settings, General, VPN & Device Management.

The simulator also works for a first look (no haptics there).

## How it fits together

- `Marrowborn/GameViewController.swift` creates the `WKWebView`, loads `web/index.html` with read access to the whole
  folder, and keeps the app in landscape with the status bar and home indicator out of the way.
- The page calls `window.Android.vibrate(pattern)` for haptics. A user script defines that object and forwards the call
  through the script message handler `mb`; the controller plays it with `UIImpactFeedbackGenerator`.
- `Marrowborn/Info.plist` holds `NSLocalNetworkUsageDescription` and the App Transport Security exceptions
  (`NSAllowsLocalNetworking`, `NSAllowsArbitraryLoadsInWebContent`) that allow plain `ws://` and `http://` to hosts on
  the local network, which have no certificates.
- Saves live in the web view's local storage inside the app, separate from Safari's.

## If the project file does not open

Create a new project in Xcode (iOS, App, Interface: Storyboard, Language: Swift) named Marrowborn. Delete its
`ViewController.swift`, `SceneDelegate.swift`, `Main.storyboard` and the "Application Scene Manifest" and "Main storyboard
file base name" entries from its Info settings. Add `AppDelegate.swift` and `GameViewController.swift` from this folder
(replacing the generated `AppDelegate.swift`), copy the keys from this folder's `Info.plist`, add `icon-1024.png` as the
app icon, and add `../web` as a folder reference as in step 3.

## Not verified

Everything on this page: building, signing, the web view's behaviour with the game (WebGL performance, audio starting
on the first touch, safe-area layout on notched phones), the haptics mapping, and the local-network permission flow.
