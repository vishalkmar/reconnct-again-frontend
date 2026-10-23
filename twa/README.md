# frontend/twa/ — Play Store wrapper for the Reconnct web app

Bubblewrap (Trusted Web Activity) config that turns the deployed PWA into an
Android app: `.aab` for Google Play, `.apk` for the website's Download button.
Full walkthrough: [../docs/web-pwa/playstore.md](../docs/web-pwa/playstore.md).

| File | What |
|---|---|
| `twa-manifest.json` | Bubblewrap config — package `com.reconnct.web`, host, colours, icons, start URL, shortcuts, signing key alias |
| `reconnct-web-upload.keystore` | **You create it** on the first `bubblewrap init` — never commit it |
| `app-release-bundle.aab` / `app-release-signed.apk` | Build outputs (git-ignored) |

## Quick commands

```bash
npm i -g @bubblewrap/cli                         # once
cd twa
bubblewrap init --manifest https://reconnct-again-frontend.vercel.app/manifest.webmanifest
#   accept the values from twa-manifest.json; create the signing key when asked
bubblewrap build                                 # → app-release-bundle.aab + app-release-signed.apk

# fingerprint for assetlinks.json
keytool -list -v -keystore reconnct-web-upload.keystore -alias reconnct-web

# publish the APK on the website (from the repo root)
node scripts/publish-apk.mjs twa/app-release-signed.apk 1.0.0 1
```

If the site moves to another domain, change `host`, every URL in
`twa-manifest.json`, then `bubblewrap update` and rebuild.
