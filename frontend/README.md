# Oil Service Frontend

Nuxt 4 + TypeScript + UnoCSS frontend for the Oil Service API.

## Run locally

1. Copy `.env.example` to `.env`.
2. Ensure the NestJS API and PostgreSQL are running.
3. Run `pnpm dev`.
4. Open `http://localhost:3001`.

## Main routes

- `/login`: password login and initial shop registration
- `/`: shop dashboard
- `/service-orders/new`: three-step service registration
- `/customers`: customer and vehicle CRM
- `/catalog`: shop product prices and service fees
- `/invoices`: invoice history and printable invoice
- `/settings`: public shop profile
- `/public/service-book/:token`: public vehicle service book
- `/admin`: super-admin shop management
- `/admin/catalog`: global catalog management
- `/admin/suggestions`: catalog suggestion review

The API base URL is configured through `NUXT_PUBLIC_API_BASE`. Authentication
uses the JWT returned by the backend and stores it in a same-site cookie.

## Android app

The Android app uses Capacitor and the same Nuxt codebase. Install Android
Studio with Android SDK 36 and use the JDK bundled with Android Studio.

For an emulator build, start the API on port `3000` and run from the repository
root:

```powershell
pnpm android:sync
pnpm android:open
```

The default mobile development build reaches the host machine through
`http://10.0.2.2:3000`. Before a release build, configure the deployed HTTPS API
and public web app. The public web URL is required because links sent to
customers must open in a browser rather than inside the installed application.

```powershell
$env:NUXT_PUBLIC_API_BASE='https://api.example.com/api/v1'
$env:NUXT_PUBLIC_PUBLIC_API_BASE='https://api.example.com'
$env:NUXT_PUBLIC_WEB_BASE='https://app.example.com'
$env:CAPACITOR_ALLOW_MIXED_CONTENT='false'
pnpm android:sync
```

Also include `https://localhost` in the API's production `CORS_ORIGINS`; this is
the local origin used by the packaged Android WebView. To create a debug APK:

```powershell
pnpm android:build:debug
```

The resulting file is written to
`frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

## Android app updates

There are two independent update channels.

For Vue/JavaScript/CSS-only changes, build an OTA web bundle without changing
the native Android version:

```powershell
pnpm android:build:web-update -- -Version '2026.08.13-1' -ReleaseNotes 'UI improvements|Bug fixes'
```

Upload `web-latest.json` and its ZIP from `.release/android-updates/` to the
server's `android-updates` directory. The app downloads the ZIP, verifies its
SHA-256, activates it in private storage, and reloads without installing an APK.

For Java, Manifest, Gradle, Capacitor plugin, or native dependency changes,
build a native release and direct users to app stores:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android-release.ps1 `
  -VersionName '1.2.0' `
  -ReleaseNotes 'Native improvements' `
  -BazaarUrl 'https://cafebazaar.ir/app/ir.roghanyar.app' `
  -MyketUrl 'https://myket.ir/app/ir.roghanyar.app' `
  -GooglePlayUrl 'https://play.google.com/store/apps/details?id=ir.roghanyar.app'
```

Upload the APK/AAB to the stores, then publish `native-latest.json` from
`.release/android-updates/` on the server. The dialog offers the configured
store links. Add `-Mandatory` only when the native update must block dismissal.

The first APK containing this dual updater must be installed normally or through
a store once. Later web releases are installed inside the app, while native
releases direct the user to the configured stores.

Configure the permanent release key before building. Keep the keystore and its
passwords outside Git and back them up securely; losing this key means existing
installations can no longer be updated.

```powershell
$env:ANDROID_KEYSTORE_PATH='C:\secure\roghanyar-release.jks'
$env:ANDROID_KEYSTORE_PASSWORD='your-store-password'
$env:ANDROID_KEY_ALIAS='roghanyar'
$env:ANDROID_KEY_PASSWORD='your-key-password'
pnpm android:build:release
```

The native APK is generated under `.release/android-native/`; web and native
manifests are generated under `.release/android-updates/`.
