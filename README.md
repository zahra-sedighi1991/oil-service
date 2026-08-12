# Oil Service API

NestJS/TypeScript backend for a multi-tenant oil-change shop and digital
vehicle service-book MVP.

The repository also contains a Nuxt 4, TypeScript and UnoCSS frontend in
`frontend/`. It includes the shop dashboard, customer and vehicle CRM,
three-step service registration, catalog pricing, invoices, public service
book and super-admin pages.

## Implemented modules

- Temporary password authentication, JWT, shop-owner and super-admin roles
- Strict shop-level isolation for customers, vehicles, service orders and prices
- Global vehicle, product and service catalogs
- Versioned dynamic product attributes with server-side schema validation
- Shop-specific product prices and service fees
- Customer and multi-vehicle CRM with Persian/Arabic digit normalization
- Draft, update, completion and cancellation lifecycle for service orders
- Atomic invoice creation, immutable snapshots, line-level due dates and odometers
- Idempotent completion through the `Idempotency-Key` header
- Secure hashed public-link tokens with revoke/regenerate support
- Customer-safe public service-book response
- Suggestions workflow and admin decisions
- Tenant dashboard and audit records
- Swagger/OpenAPI documentation and request validation

## Local setup

1. Copy `.env.example` to `.env` and replace `JWT_SECRET`.
2. Start PostgreSQL with `docker compose up -d`.
3. During local development the schema is synchronized automatically unless
   `DB_SYNCHRONIZE=false` is explicitly configured.
4. Start the API with `pnpm start:dev`.

The API listens on `http://localhost:3000`. Private endpoints are under
`/api/v1`, the public vehicle book is at `/public/v1/service-book/:token`,
Swagger is at `/docs`, and the health endpoint is `/health`.

## Frontend

```bash
cd frontend
copy .env.example .env
pnpm dev
```

The frontend listens on `http://localhost:3001` by default and expects the API
at `http://localhost:3000`. Configure alternate addresses through
`NUXT_PUBLIC_API_BASE` and `NUXT_PUBLIC_PUBLIC_API_BASE`.

An Android Capacitor project is available under `frontend/android`. Run
`pnpm android:sync` to generate and copy the mobile SPA, then
`pnpm android:open` to open it in Android Studio. Release builds must set
`NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_PUBLIC_API_BASE` and
`NUXT_PUBLIC_WEB_BASE` to deployed HTTPS addresses. See
[`frontend/README.md`](frontend/README.md) for the complete Android workflow.

## گرفتن خروجی APK اندروید

تمام دستورهای این بخش را در PowerShell و از پوشه اصلی پروژه اجرا کنید.

### پیش‌نیازها

- Node.js و `pnpm`
- Android Studio
- Android SDK Platform 36 و Build Tools 36
- JDK 21؛ ترجیحاً JDK همراه Android Studio

اگر پروژه اندروید را برای اولین بار باز می‌کنید، ابتدا این دو دستور را اجرا
کنید و صبر کنید Gradle Sync در Android Studio تمام شود:

```powershell
pnpm android:sync
pnpm android:open
```

### خروجی آزمایشی Debug

این نسخه فقط برای نصب روی گوشی خودتان و تست شبکه محلی مناسب است. در نسخه Debug
پس از بازشدن برنامه می‌توانید IP سیستم اجراکننده API را وارد کنید.

```powershell
pnpm android:build:debug
```

فایل خروجی در این مسیر ساخته می‌شود:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

این فایل را به گوشی منتقل و نصب کنید. اگر نصب مسدود شد، در تنظیمات اندروید اجازه
`Install unknown apps` را برای برنامه‌ای که APK را باز کرده است فعال کنید.

> نسخه Debug را برای مشتری منتشر نکنید. امضای Debug با Release متفاوت است و
> نسخه Release بعدی معمولاً روی آن نصب نمی‌شود.

### ساخت اولین نسخه Release

نسخه مشتری باید با یک کلید ثابت امضا شود. این کلید را فقط یک‌بار بسازید و از خود
فایل و رمزهای آن نسخه پشتیبان امن نگه دارید. گم‌شدن کلید یعنی نسخه‌های نصب‌شده
دیگر قابل به‌روزرسانی نیستند.

اگر `keytool` در PATH سیستم قرار دارد، نمونه دستور ساخت کلید:

```powershell
New-Item -ItemType Directory -Force C:\secure
keytool -genkeypair -v -keystore C:\secure\roghanyar-release.jks -alias roghanyar -keyalg RSA -keysize 2048 -validity 10000
```

قبل از ساخت Release، آدرس‌های واقعی HTTPS و مشخصات همان کلید را در همان پنجره
PowerShell تنظیم کنید:

```powershell
$env:NUXT_PUBLIC_API_BASE='https://api.example.com/api/v1'
$env:NUXT_PUBLIC_PUBLIC_API_BASE='https://api.example.com'
$env:NUXT_PUBLIC_WEB_BASE='https://app.example.com'
$env:CAPACITOR_ALLOW_MIXED_CONTENT='false'

$env:ANDROID_KEYSTORE_PATH='C:\secure\roghanyar-release.jks'
$env:ANDROID_KEYSTORE_PASSWORD='رمز-keystore'
$env:ANDROID_KEY_ALIAS='roghanyar'
$env:ANDROID_KEY_PASSWORD='رمز-key'

pnpm android:build:release
```

فایل Release امضاشده در این پوشه ساخته می‌شود:

```text
frontend/android/app/build/outputs/apk/release/
```

فایل معمولاً `app-release.apk` نام دارد. همین فایل برای نصب مشتری و انتشار روی
سرور دانلود مناسب است.

### خروجی Release از داخل Android Studio

اگر ترجیح می‌دهید از رابط Android Studio استفاده کنید:

1. دستور `pnpm android:sync` را اجرا کنید.
2. دستور `pnpm android:open` را اجرا کنید.
3. صبر کنید Gradle Sync کامل شود.
4. از منوی `Build` گزینه `Generate Signed App Bundle or APK` را انتخاب کنید.
5. گزینه `APK` و سپس Keystore ثابت پروژه را انتخاب کنید.
6. نوع Build را روی `release` قرار دهید و خروجی را بسازید.

اگر گزینه ساخت APK در منوی Build دیده نمی‌شود، از پنجره Gradle مسیر
`app > Tasks > build > assembleRelease` را اجرا کنید یا از دستور PowerShell
`pnpm android:build:release` استفاده کنید.

### آماده‌سازی هر نسخه جدید

قبل از گرفتن هر خروجی جدید، در فایل
`frontend/android/app/build.gradle` این دو مقدار را تغییر دهید:

```gradle
versionCode 3
versionName "1.2.0"
```

- `versionCode` باید در هر انتشار حتماً یک عدد بیشتر شود.
- `versionName` نسخه‌ای است که کاربر می‌بیند.
- همه نسخه‌ها باید با همان Keystore نسخه اول امضا شوند.

بعد از ساخت و بارگذاری APK روی یک آدرس HTTPS، تنظیمات API را به نسخه جدید تغییر
دهید و API را دوباره راه‌اندازی کنید:

```dotenv
ANDROID_LATEST_VERSION_CODE=3
ANDROID_LATEST_VERSION_NAME=1.2.0
ANDROID_MIN_SUPPORTED_VERSION_CODE=0
ANDROID_APK_URL=https://downloads.example.com/roghanyar-1.2.0.apk
ANDROID_RELEASE_NOTES=بهبود ثبت سرویس|رفع خطاهای گزارش‌شده
```

مقدار `ANDROID_MIN_SUPPORTED_VERSION_CODE=0` آپدیت را اختیاری نگه می‌دارد. برای
اجباری‌شدن آپدیت، آن را برابر حداقل `versionCode` قابل استفاده قرار دهید. نصب
نهایی APK همیشه باید توسط کاربر در صفحه نصب اندروید تأیید شود.

### اگر خروجی ساخته نشد

- از مسیر `File > Settings > Build Tools > Gradle` مطمئن شوید Gradle JDK روی
  JDK 21 قرار دارد.
- در SDK Manager نصب‌بودن Android SDK Platform 36 و Build Tools 36 را بررسی
  کنید.
- خط `Deprecated Gradle features` به‌تنهایی علت شکست Build نیست؛ چند خط بالاتر
  از `BUILD FAILED` خطای اصلی نوشته می‌شود.
- اگر APK جدید روی نسخه قبلی نصب نشد، معمولاً `versionCode` افزایش نیافته یا
  فایل با Keystore متفاوتی امضا شده است.

`DB_SYNCHRONIZE` must be disabled in production. Generate and review a TypeORM
migration before the first production deployment.

## Authentication

OTP is temporarily disabled through `OTP_ENABLED=false`. Initial registration
uses a mobile number and password:

```http
POST /api/v1/auth/password/register
Content-Type: application/json

{
  "name": "Shop Owner",
  "mobile": "09120000000",
  "password": "a-strong-password",
  "shopName": "Example Oil Service",
  "city": "Tehran"
}
```

Existing users can sign in with:

```http
POST /api/v1/auth/password/login
Content-Type: application/json

{
  "mobile": "09120000000",
  "password": "a-strong-password"
}
```

Send the returned token as `Authorization: Bearer <token>`.

If `ADMIN_MOBILE` is configured, a super-admin account is created on startup.
Set `ADMIN_PASSWORD` and use the password-login endpoint for that number.
Passwords are salted and hashed with Node.js `scrypt`; plaintext passwords are
never stored. The OTP implementation remains behind the `OTP_ENABLED` flag for
later integration.

## Service completion

Create a draft at `POST /api/v1/service-orders`, then complete it atomically:

```http
POST /api/v1/service-orders/:id/complete
Authorization: Bearer <token>
Idempotency-Key: a-client-generated-unique-value
Content-Type: application/json

{"discountAmount":0}
```

Temporary product or local-service lines can omit their catalog ID and provide
`description`; a pending catalog suggestion is created automatically.

## Production notes

- For a low-resource VPS, build Linux Docker images locally and upload the
  ready-to-run release bundle. See [`deploy/README.md`](deploy/README.md).
- Before restoring OTP, replace its in-memory challenge store with Redis and connect an SMS provider.
- Use reviewed TypeORM migrations instead of schema synchronization.
- Terminate TLS at the reverse proxy and set a strong JWT secret.
- Add encrypted backups, restore drills, structured logging and error tracking.
- Public-link raw tokens are never stored; only their SHA-256 hashes are persisted.
