import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        application.isIdleTimerDisabled = true   // the screen stays on while the game is open
        let w = UIWindow(frame: UIScreen.main.bounds)
        w.backgroundColor = UIColor(red: 7 / 255, green: 9 / 255, blue: 18 / 255, alpha: 1)
        w.rootViewController = GameViewController()
        w.makeKeyAndVisible()
        window = w
        return true
    }

    func application(_ application: UIApplication,
                     supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        return .landscape
    }
}
