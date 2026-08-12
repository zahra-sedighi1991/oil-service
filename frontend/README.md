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

The packaged Android app checks the public API for a newer version when it
starts. Directly installed APK files cannot update silently: Android asks the
user to allow installs from this app once and confirms every installation.

For every release:

1. Increase both `versionCode` and `versionName` in
   `android/app/build.gradle`. `versionCode` must always increase.
2. Build and sign the APK with the same release keystore used for every older
   version. Android rejects an update signed by another key.
3. Upload the APK to a stable HTTPS URL.
4. Configure and restart the API:

```dotenv
ANDROID_LATEST_VERSION_CODE=3
ANDROID_LATEST_VERSION_NAME=1.2.0
ANDROID_MIN_SUPPORTED_VERSION_CODE=0
ANDROID_APK_URL=https://downloads.example.com/roghanyar-1.2.0.apk
ANDROID_RELEASE_NOTES=بهبود ثبت سرویس|رفع خطاهای گزارش‌شده
```

Set `ANDROID_MIN_SUPPORTED_VERSION_CODE` to the minimum usable build only when
an update must be mandatory. Keep it `0` for an optional update that users can
dismiss for 24 hours. The APK URL must be HTTPS in release builds.

The first update-aware APK (`versionCode 2`) must be installed manually once.
Later versions are detected by the app. If the app is eventually distributed
through Google Play, use Play's managed in-app updates instead of direct APK
installation.

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

The signed release APK is generated under
`frontend/android/app/build/outputs/apk/release/`.
