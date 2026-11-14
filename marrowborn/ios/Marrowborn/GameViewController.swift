import UIKit
import WebKit

/// The whole app: one full-screen WKWebView showing the bundled game (the `web` folder, copied into the app as a folder reference).
///
/// The page talks to its host through `window.Android` (the name comes from the Android app). Here that object has only
/// `vibrate(pattern)`, forwarded to this controller and played with the Taptic Engine. It has no `startServer`, so the
/// multiplayer lobby offers joining a game but not hosting one: an iPhone joins games hosted by an Android phone or by
/// the Marrowborn server on a computer.
final class GameViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private var web: WKWebView!
    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 7 / 255, green: 9 / 255, blue: 18 / 255, alpha: 1)

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let bridge = """
        window.Android = { vibrate: function (p) { try { window.webkit.messageHandlers.mb.postMessage({ vibrate: String(p) }); } catch (e) {} } };
        """
        config.userContentController.addUserScript(
            WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController.add(WeakHandler(self), name: "mb")

        web = WKWebView(frame: view.bounds, configuration: config)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.navigationDelegate = self
        web.isOpaque = false
        web.backgroundColor = view.backgroundColor
        web.scrollView.backgroundColor = view.backgroundColor
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never   // the page handles the notch itself (env(safe-area-inset-*))
        web.allowsBackForwardNavigationGestures = false
        web.allowsLinkPreview = false
        view.addSubview(web)

        guard let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            let label = UILabel(frame: view.bounds)
            label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            label.textColor = .white
            label.textAlignment = .center
            label.numberOfLines = 0
            label.text = "The game files are missing from the app.\nAdd the web folder to the target as a folder reference (see ios/README.md)."
            view.addSubview(label)
            return
        }
        // read access to the whole folder: the page loads its scripts, fonts and icons from beside index.html
        web.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
    }

    // MARK: bridge

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "mb", let body = message.body as? [String: Any] else { return }
        if let pattern = body["vibrate"] as? String { vibrate(pattern) }
    }

    /// The page sends "40" (one buzz of 40 ms) or "60,40,200" (buzz, pause, buzz ...). iPhones have no timed vibration
    /// for apps, so each buzz becomes one tap whose weight follows its length.
    private func vibrate(_ pattern: String) {
        let parts = pattern.split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
        var at = 0.0
        for (i, ms) in parts.prefix(8).enumerated() {
            if i % 2 == 0 {
                let generator = ms <= 15 ? light : ms <= 45 ? medium : heavy
                if at == 0 { generator.impactOccurred() }
                else { DispatchQueue.main.asyncAfter(deadline: .now() + at / 1000) { generator.impactOccurred() } }
            }
            at += min(max(ms, 0), 600)
        }
    }

    // MARK: navigation: the game never leaves its own files

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url, url.isFileURL || url.scheme == "about" { decisionHandler(.allow) }
        else { decisionHandler(.cancel) }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()   // iOS ended the page's process (memory pressure): start it again rather than show a blank screen
    }
}

/// WKUserContentController keeps its handlers alive; going through a weak reference avoids a retain cycle with the controller.
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    private weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}
