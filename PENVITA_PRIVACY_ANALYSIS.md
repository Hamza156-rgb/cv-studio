# Penvita Mobile App: Privacy Analysis

Purpose: factual input for the Privacy Policy, Terms & Conditions and Google Play Data Safety form.
Method: static reading of the source in this repository. No files were modified except this report, and the app was not run.
Rules used: every claim cites `path:line`. Anything not verifiable is marked **NOT FOUND IN CODE**. Paths are relative to the repository root. No secret values are reproduced.

> **Scope note.** The mobile app (`mobile/`) is a thin Capacitor/Ionic client. All user content (accounts, resumes, photos) is processed and stored by the **server** in `server/`, which the app calls at `/api/v1`. The server code is in this repo, so it is analysed here. What the *production* host actually logs, retains or backs up cannot be seen from code (see section 12).

---

## 1. APP BASICS

| Item | Value | Source |
|---|---|---|
| App name | Penvita | `mobile/capacitor.config.ts:5`, `mobile/android/app/src/main/res/values/strings.xml:3`, `mobile/ios/App/App/Info.plist:10` |
| Android applicationId | `com.shoptechsystems.penvita` | `mobile/android/app/build.gradle:7` |
| iOS bundle ID | `com.shoptechsystems.penvita` | `mobile/ios/App/App.xcodeproj/project.pbxproj` (`PRODUCT_BUNDLE_IDENTIFIER`) |
| Android version | versionName `1.0`, versionCode `1` | `mobile/android/app/build.gradle:10-11` |
| iOS version | `MARKETING_VERSION = 1.0`, build `1` | `mobile/ios/App/App.xcodeproj/project.pbxproj` |
| npm package | `cv-studio-mobile` 1.0.0 (private) | `mobile/package.json:2-4` |
| Framework | Ionic React 9 + Capacitor 8.5.3 (web app in a WebView), React 19, Vite | `mobile/package.json:18-34` |
| Android min / target / compile SDK | 24 / 36 / 36 | `mobile/android/variables.gradle:2-4` |
| iOS minimum | 15.0 | `mobile/ios/App/CapApp-SPM/Package.swift:7`; `project.pbxproj` (`IPHONEOS_DEPLOYMENT_TARGET`) |
| Release minification | disabled (`minifyEnabled false`) | `mobile/android/app/build.gradle:21` |
| Native code | Empty `BridgeActivity` subclass only | `mobile/android/app/src/main/java/com/shoptechsystems/penvita/MainActivity.java:5` |
| Default backend | `https://cvbuilder-2ad3qnae.manus.space` | `mobile/.env.production:2` |

### What the app does (verified from screens and routes)

Penvita is a résumé/CV builder. Its signed-in routes are `/home`, `/resumes/:id`, `/templates`, `/photos` and `/profile` (`mobile/src/App.tsx:23-27`). Signed-out routes are `/welcome`, `/login` and `/signup` (`mobile/src/App.tsx:50-52`).

- **Onboarding.** A three-slide introduction on first launch (`mobile/src/pages/OnboardingPage.tsx:11-13`). The "seen" flag is stored on-device (`mobile/src/lib/onboarding.ts:3-6`).
- **Account.** Sign up with name, email and password, or sign in with email and password (`mobile/src/pages/AuthPage.tsx:58-73`).
- **Résumés.**
  - List, create, edit, duplicate and delete résumés (`mobile/src/api/client.ts:89-94`; `mobile/src/pages/HomePage.tsx:55,163`).
  - A guided editor autosaves 1.2 s after the last change (`mobile/src/pages/ResumeEditorPage.tsx:15,54`).
  - Style options: template, accent colour, font, density, photo shape, ATS mode, page size (`shared/resume.ts:32-40`).
- **Import.** Upload a PDF or DOCX (`mobile/src/components/NewResumeSheet.tsx:24-29`).
- **Templates.** 18 templates (`shared/resume.ts:1-20`).
- **Photos.** Take or choose a headshot, upload it, and reuse it across résumés (`mobile/src/pages/PhotosPage.tsx`, `mobile/src/lib/files.ts:33-48`).
- **PDF export.** The server renders the PDF. The app then opens the OS share sheet (`mobile/src/lib/files.ts:51-64`).
- **Profile.** Shows name, email and join date. Has a sign-out button and a link that opens the website (`mobile/src/pages/ProfilePage.tsx:25-45`).

Résumé fields stored (`shared/resume.ts:42-62`): full name, professional title, email, phone, location, website, LinkedIn, GitHub, photo URL, summary, experience, education (including grade), skills, projects, certifications, languages, awards, volunteering and interests.

---

## 2. PERMISSIONS

### Android (`mobile/android/app/src/main/AndroidManifest.xml`)

| Permission | Declared at | Where used | Why |
|---|---|---|---|
| `android.permission.INTERNET` | line 35 | Every API call (`mobile/src/api/client.ts:55`) | Talk to the Penvita server and load Google Fonts |

This is the only `<uses-permission>` in the app manifest. Other manifest facts:

- **No dangerous permissions are declared.** The camera plugin's own manifest declares only `<queries>` intents (IMAGE_CAPTURE, GET_CONTENT, PICK) (`mobile/node_modules/@capacitor/camera/android/src/main/AndroidManifest.xml`). Its README says no permissions are needed unless `saveToGallery: true` is used (`mobile/node_modules/@capacitor/camera/README.md:47`). The app does not set that flag (`mobile/src/lib/files.ts:37`).
- **FileProvider.** A FileProvider is declared, with `external-path` and `cache-path` roots set to `.` (`AndroidManifest.xml:24-30`; `mobile/android/app/src/main/res/xml/file_paths.xml:3-4`). It is not exported.
- **`android:usesCleartextTraffic="true"`** (`AndroidManifest.xml:4`), plus `cleartext: true` and `allowMixedContent: true` (`mobile/capacitor.config.ts:9-10`). Plain HTTP is therefore permitted. The comment says this is for local testing (`capacitor.config.ts:7-8`).
- **`android:allowBackup="true"`** (`AndroidManifest.xml:5`). Android Auto Backup may include the app's SharedPreferences, where the sign-in token lives (see section 3).
- **Play-services plugin.** `google-services.json` is *conditionally* applied only if the file exists (`mobile/android/app/build.gradle:47-54`). `ls mobile/android/app/` shows no such file.

### iOS (`mobile/ios/App/App/Info.plist`)

| Key | Line | Declared reason |
|---|---|---|
| `NSCameraUsageDescription` | 69-70 | "Penvita uses the camera so you can take a professional headshot for your resume." |
| `NSPhotoLibraryUsageDescription` | 71-72 | "Penvita lets you choose a headshot from your photos for your resume." |
| `NSPhotoLibraryAddUsageDescription` | 73-74 | "Penvita can save photos you take to your library." |

- The camera and photo library are used in `mobile/src/lib/files.ts:37` (`Camera.getPhoto`, `CameraSource.Prompt`).
- The "save photos to your library" string has no matching code path: `saveToGallery` is never set. It is declared but unused.
- No `NSAppTransportSecurity` exception is present. iOS therefore blocks plain HTTP, so the Capacitor `cleartext` setting has no iOS effect (inference from the plist; not tested).

### Not requested anywhere in code
Location, contacts, microphone, SMS, phone, calendar, notifications, advertising ID, biometrics, background modes. Greps for geolocation, contacts, `@capacitor/device` and advertising found nothing in `mobile/src`. The only Capacitor plugins are App, Camera, Filesystem, Preferences and Share (`mobile/package.json:18-25`; `mobile/android/app/capacitor.build.gradle:12-16`).

---

## 3. DATA COLLECTED

"Server" below means the Penvita backend reached at `/api/v1` (`mobile/src/api/client.ts:11`). Server persistence is MySQL via Drizzle (`server/db.ts:11`; `drizzle/schema.ts`).

| # | Data | Source in app | Stored on device? | Sent off-device? | Server storage |
|---|---|---|---|---|---|
| 1 | **Name** | Sign-up form (`AuthPage.tsx:60`) | In memory only (`AuthContext.tsx:26`) | Yes, `POST /auth/signup` (`client.ts:82`) | `users.name` (`drizzle/schema.ts:6`) |
| 2 | **Email** | Sign-up and sign-in (`AuthPage.tsx:62`) | In memory only | Yes | `users.email`, `credentialAccounts.email` (`schema.ts:7,38`); lower-cased (`credentialAuth.ts:54`) |
| 3 | **Password** | Sign-up and sign-in (`AuthPage.tsx:66`) | Not stored | Yes, plaintext in the HTTPS body | Only a scrypt hash with random salt: `credentialAccounts.passwordHash` (`credentialAuth.ts:18-23`; `schema.ts:39`) |
| 4 | **Session token (JWT, HS256, 30 days)** | Returned by the server (`mobileApi.ts:20,61-64`) | **Yes.** Capacitor Preferences, key `cv-studio.session`, with `expiresAt` (`AuthContext.tsx:5,20`). On Android this is SharedPreferences group `CapacitorStorage` and on iOS `UserDefaults.standard` (plugin source `Preferences.java`, `Preferences.swift`). **Not encrypted** (`mobile/README.md:57`). | Sent as `Authorization: Bearer` on every request (`client.ts:57`) | Stateless: not stored server-side (`mobileApi.ts:121`) |
| 5 | **Résumé content** (all fields in section 1) | Typed into the editor, or imported | Held in memory while editing. **No local database or cache was found.** | Yes. `PATCH /resumes/:id` (autosave) and `POST /resumes` (`client.ts:91-92`) | `resumes.data` (JSON, `longtext`), `title`, `template` (`schema.ts:15-23`) |
| 6 | **Uploaded PDF/DOCX** (existing résumé) | File picker (`files.ts:18-27`; `NewResumeSheet.tsx:24`) | Not stored | Yes, base64 in `POST /resumes/import` (`client.ts:95`) | **Not saved**: parsed and returned only (`mobileApi.ts:134-141`). Extracted fields enter a résumé only if the user then creates one. Max 8 MB (`resumeImport.ts:6`). |
| 7 | **Headshot photo** (camera or library) | `Camera.getPhoto` / file picker (`files.ts:35-45`) | Resized to ≤800 px JPEG ≤2 MB in the WebView (`client/src/lib/headshot.ts:1-31`). The Capacitor camera returns a temporary URI. No explicit copy is kept by app code. | Yes, base64 in `POST /photos` (`client.ts:104`) | File: `resume-photos/{userId}/{nanoid}_{hash}.jpg` in S3 via the Forge API, or `uploads/` on disk if Forge is not configured (`storage.ts:51-95`; `mobileApi.ts:185`). Metadata (`fileName`, `mimeType`, `url`, `storageKey`) in `resumePhotos` (`schema.ts:25-33`). |
| 8 | **Generated PDF** | `GET /resumes/:id/pdf` (`client.ts:96-100`) | Written to the app **cache** dir then shared (`files.ts:62-63`) | Downloaded from server. Leaves the device only if the user shares it. | Not stored; rendered per request (`resumePdf.ts:108-131`) |
| 9 | **Server address override** | Hidden picker (long-press logo ~1.2 s, `AuthPage.tsx:24-28`) | `localStorage` key `cv-studio.server` (`client.ts:5,16`) | n/a | n/a |
| 10 | **Onboarding-seen flag** | `onboarding.ts:6` | Preferences key `cv-studio.onboarded` | No | n/a |
| 11 | **Account timestamps** (`createdAt`, `updatedAt`, `lastSignedIn`) | Server-generated | No | Returned in the `User` DTO (`mobileApi.ts:50-52`) | `users` (`schema.ts:10-12`); `lastSignedIn` updated on each login (`db.ts:76-79`) |
| 12 | **IP address** | Server sees it on each request | No | Yes (inherent) | Used in memory for brute-force limiting (`req.ip|email`, 10 failures / 15 min; `mobileApi.ts:66-80`). **Not persisted by app code.** Host/proxy logs: NOT FOUND IN CODE. |
| 13 | **Résumé "role"** | Server-assigned `user`/`admin` | No | No | `users.role` (`schema.ts:9`; `db.ts:67`) |

### Data the app does **not** read or collect
No contacts, location, device or advertising IDs, installed apps, SMS, call logs, microphone input, clipboard, or biometrics were found in code. Greps for geolocation, contacts, device and advertising returned nothing in `mobile/src`.

### On-device storage summary
- **SharedPreferences / UserDefaults** (Capacitor Preferences): session token and expiry, onboarding flag (`AuthContext.tsx:20`; `onboarding.ts`).
- **WebView localStorage**: server override only (`client.ts:9,16`).
- **Cache directory**: exported PDFs (`files.ts:62`). Nothing in the code deletes them afterwards.
- **No SQLite, no local résumé copy, and no offline mode.** If offline, the app only keeps an existing session (`AuthContext.tsx:54-55`).

---

## 4. NETWORK & BACKEND

**Base URL:** `${VITE_API_URL}/api/v1`. The release build bakes in `https://cvbuilder-2ad3qnae.manus.space` (`mobile/.env.production:2`; `client.ts:8-11`). The fallback if nothing is set is `http://localhost:3000` (`client.ts:8`). The user can change the server from a hidden screen (`AuthPage.tsx:24-28`; `ServerSettings.tsx`). Presets offered there are the default, the live site, and the developer's LAN address `http://192.168.1.106:3000` (`ServerSettings.tsx:6-7,14`). Any URL typed there is accepted if it answers as "Penvita API" (`client.ts:19-28`). **Sign-in credentials and all content go to whichever server is selected.**

### API calls made by the app (`mobile/src/api/client.ts`; handlers in `server/mobileApi.ts`)

| Endpoint | Sends | Receives | Handler |
|---|---|---|---|
| `GET /api/v1` (server check) | nothing | `{name}` | `mobileApi.ts:95`; `client.ts:22` |
| `GET /templates` | nothing (no auth) | Template catalogue | `mobileApi.ts:97` |
| `POST /auth/signup` | name, email, password | Session `{token, expiresAt, user}` | `mobileApi.ts:100-109` |
| `POST /auth/login` | email, password | Session | `mobileApi.ts:110-118` |
| `POST /auth/refresh` | Bearer token | New 30-day token | `mobileApi.ts:119` |
| `GET /auth/me` | Bearer token | `{id, name, email, createdAt}` | `mobileApi.ts:120` |
| `POST /auth/logout` | Bearer token | `204`. **Does not revoke the token** (`mobileApi.ts:121-122`) | same |
| `GET /resumes`, `GET /resumes/:id` | Bearer | Résumé(s) | `mobileApi.ts:125-146` |
| `POST /resumes` | title, template, data | Résumé | `mobileApi.ts:129-134` |
| `PATCH /resumes/:id` | title / template / full data | Résumé | `mobileApi.ts:147-156` |
| `DELETE /resumes/:id` | Bearer | `204` | `mobileApi.ts:157-161` |
| `POST /resumes/:id/duplicate` | Bearer | Copy | `mobileApi.ts:162-166` |
| `POST /resumes/import` | `fileName`, base64 PDF/DOCX | Parsed data, text preview | `mobileApi.ts:134-142` |
| `GET /resumes/:id/pdf[?template=]` | Bearer | PDF bytes | `mobileApi.ts:167-174` |
| `GET /photos` | Bearer | Photo list with absolute URLs | `mobileApi.ts:176-180` |
| `POST /photos` | `fileName`, base64 image | Photo record | `mobileApi.ts:181-190` |
| `GET {server}/manus-storage/{key}` | none (no auth) | Image, shown as `<img src>` (`PhotosPage.tsx:55`; `client.ts:109-110`) | `server/_core/storageProxy.ts:6-55` |

### Other outbound connections from the app
- **Google Fonts.** `mobile/src/generated/resume.css:2` imports `https://fonts.googleapis.com/css2?family=DM+Mono…DM+Sans…Newsreader`. It is imported at `mobile/src/main.tsx:12`, and generated from `client/src/index.css:1`. The WebView therefore requests fonts from Google at runtime, which exposes IP and user-agent to Google. A copy is **not bundled** locally (no font files found).
- **"Open the website"** is an `<a target="_blank" href={API_ORIGIN}>` (`ProfilePage.tsx:42`).
- Share sheet and file save are OS-level (`@capacitor/share`, `files.ts:63`).

### Server-side outbound connections (relevant to data flows)
- **Forge storage (S3) API.** When `BUILT_IN_FORGE_API_URL` and `KEY` are set, photos are uploaded via a presigned PUT, and reads are 307-redirected to a presigned GET (`server/storage.ts:61-95`; `server/_core/storageProxy.ts:25-50`). The host behind that URL is configured via env, and its identity is **NOT FOUND IN CODE**. Without Forge config, photos go to local disk (`storage.ts:53-58`).
- **PDF rendering.** Headless Chromium/Puppeteer renders `/render/resume` on the server itself (`resumePdf.ts:124`). Its only permitted external hosts are `fonts.googleapis.com` and `fonts.gstatic.com` (`resumePdf.ts:14,117`). Photos are fetched via the storage proxy and are not cached (`resumePdf.ts:99-100`).
- **OCR.** Scanned PDFs are OCR'd on the server with `tesseract.js` (`resumeImport.ts:47-52`). `createWorker("eng")` is called with no `langPath`. A local `eng.traineddata` exists at the repo root, but whether the language file is fetched from a CDN at runtime in production is **NOT FOUND IN CODE** (see section 12).
- **Database.** MySQL at `DATABASE_URL` (`server/db.ts:11`; `server/_core/env.ts:4`). Provider: NOT FOUND IN CODE.
- **Manus OAuth** (`/api/oauth/callback`, `server/_core/oauth.ts`, `sdk.ts`). This is a **web-only** path. The mobile app never calls it (`AuthPage` uses email/password only). It is mentioned because it shares the `users` table.

### Transport / CORS
`Access-Control-Allow-Origin: *` is set on `/api/v1` (`mobileApi.ts:215-217`). Auth is bearer-token, not cookies. Request bodies up to 50 MB are accepted (`server/_core/index.ts:37`).

---

## 5. THIRD-PARTY SDKs / LIBRARIES

### Mobile app (`mobile/package.json`)

| Library | Touches user data? | What it does here |
|---|---|---|
| `@capacitor/camera` 8.2.6 | Yes (photos) | Camera / photo-library picker for the headshot (`files.ts:37`). No network. |
| `@capacitor/filesystem` 8.1.5 | Yes (PDF) | Writes the exported PDF to the cache dir (`files.ts:62`). |
| `@capacitor/share` 8.0.3 | Yes (PDF) | OS share sheet (`files.ts:63`). |
| `@capacitor/preferences` 8.0.1 | Yes (token) | Stores session token and onboarding flag (`AuthContext.tsx:20`). |
| `@capacitor/app` 8.1.2 | No | Installed. No import found in `mobile/src`. |
| `@capacitor/core` / `android` / `ios` 8.5.3 | n/a | Runtime / bridge. |
| `@ionic/react`, `@ionic/react-router`, `ionicons` | No | UI. |
| `react`, `react-dom`, `react-router(-dom)`, `lucide-react` | No | UI. |

Shared code is imported from the website: `shared/resume.ts`, `client/src/components/resume/ResumeDocument.tsx`, `richText.ts`, `headshot.ts` (`mobile/vite.config.ts:11-14`; `mobile/README.md:22-27`).

**Not present in the app:** analytics, crash reporting, ads, push, payments or an AI SDK. Greps for these terms in `mobile/`, `server/` and `client/` found nothing outside the items listed below. No `firebase`, `sentry`, `admob`, `stripe`, `revenuecat` or `amplitude` appears in `mobile/package.json` or the Gradle files.

### Server (`package.json`), user-data relevant

| Library | Role |
|---|---|
| `mysql2`, `drizzle-orm` | Database |
| `jose`, `node:crypto` scrypt | JWT sessions, password hashing (`credentialAuth.ts:1-6`) |
| `puppeteer`, `@sparticuz/chromium` | PDF rendering (`resumePdf.ts`) |
| `pdf-parse`, `mammoth`, `tesseract.js` | Reading uploaded PDF/DOCX/scans (`resumeImport.ts:1-4,48`) |
| `@aws-sdk/client-s3`, `s3-request-presigner` | Listed in dependencies. **No import found** in `server/` (storage uses `fetch` to the Forge API, `storage.ts`). |
| `axios` | Used only in `server/_core/sdk.ts` (Manus OAuth, web-only path). Not used by `/api/v1`. |

### Website-only (not in the mobile bundle)
- **Umami analytics.** `client/src/main.tsx:13-14` injects `${VITE_ANALYTICS_ENDPOINT}/umami` only if that env var is set. `mobile/src/main.tsx` and `mobile/index.html` contain no such script. Whether the website in production sets it: NOT FOUND IN CODE.
- Template scaffolding unused by the app: Google Maps component (`client/src/components/Map.tsx:89-91`), `AIChatBox`, `server/_core/llm.ts`, `imageGeneration.ts`, `voiceTranscription.ts`, `notification.ts`. See section 10.

---

## 6. ACCOUNTS & AUTH

- **Login / signup exists.** Email + password only. Name, email and password are required for signup; the password is 8–128 characters (`AuthPage.tsx:29-30`; `mobileApi.ts:31-32`; `credentialAuth.ts:14-16`).
- **No social login, phone login, magic link or biometrics** in the mobile app. The web has a separate Manus OAuth route (`server/_core/oauth.ts`), which the app does not use.
- **Password storage:** scrypt, 16-byte random salt, 64-byte key, stored as `scrypt$salt$hash` (`credentialAuth.ts:18-23`). Comparison is constant-time (`credentialAuth.ts:30`).
- **Sessions:** HS256 JWT with `sub=userId`, a random `jti` and a 30-day lifetime for mobile (`credentialAuth.ts:33-35`; `mobileApi.ts:20`). The web cookie session is 7 days (`credentialAuth.ts:12`).
- **Refresh:** on launch, if less than 7 days remain, the app calls `/auth/refresh` (`AuthContext.tsx:6-7,51`).
- **Sign-out:** the app deletes the local token and calls `/auth/logout`, which is a server no-op. The token stays valid until it expires (`AuthContext.tsx:67`; `mobileApi.ts:121-122`).
- **Brute-force guard:** 10 failures per email+IP per 15 minutes, in-memory only (`mobileApi.ts:66-80`).
- **Account enumeration:** signup returns "An account already exists for this email address." (`credentialAuth.ts:59`; `mobileApi.ts:107`).
- **No password reset, email verification, change-password or change-email.** None found in app or server (`mobileApi.ts` route list; `ProfilePage.tsx`).

### Deletion features
| Feature | Present? | Evidence |
|---|---|---|
| Delete a résumé | **Yes** (confirm dialog; hard delete from DB) | `HomePage.tsx:55`; `mobileApi.ts:157-161`; `db.ts:110-114` |
| Delete a photo | **NOT FOUND IN CODE.** The API has only list and upload. | `client.ts:103-105`; `mobileApi.ts:176-190`; `server/routers.ts:98-106` |
| **Delete account / all data** | **NOT FOUND IN CODE.** No endpoint, no UI, no DB function. | `ProfilePage.tsx` (only sign-out); `mobileApi.ts` (no delete route); `server/db.ts` (no delete-user function) |
| Deleting a résumé also deleting its photos | **No.** Photos live in a separate table and storage and are untouched. | `db.ts:110-114` vs `schema.ts:25` |

⚠ **Google Play requires an in-app path and a web path to request account and data deletion** for apps with account creation. This is a gap (section 12).

---

## 7. ADS, ANALYTICS, PURCHASES

| Category | Finding |
|---|---|
| Ad networks (AdMob etc.) | **NOT FOUND IN CODE** (mobile, server or website). |
| Analytics in the mobile app | **NOT FOUND IN CODE.** `mobile/src/main.tsx` and `mobile/index.html` load none. |
| Analytics on the website | Optional Umami, only if the env var is set (`client/src/main.tsx:13-14`). |
| Crash reporting | **NOT FOUND IN CODE.** The server only uses `console.error` (`mobileApi.ts:201`). |
| In-app purchases / subscriptions | **NOT FOUND IN CODE.** No billing library or paywall. The sign-up screen says "it's free" (`AuthPage.tsx:11`). |
| Push notifications | **NOT FOUND IN CODE.** The Gradle comment mentions it generically (`build.gradle:53`) but no push plugin is installed. |
| Dev-only collector | `vite-plugin-manus-runtime` and `/__manus__/debug-collector.js` are wired in the website's Vite config (`vite.config.ts:79-91`; `package.json:112`). The mobile build uses its own Vite config without them (`mobile/vite.config.ts`). |

---

## 8. DATA SECURITY

**Encryption in transit**
- The release default is HTTPS (`mobile/.env.production:2`).
- Not enforced everywhere:
  - `usesCleartextTraffic="true"` (`AndroidManifest.xml:4`).
  - `cleartext: true` and `allowMixedContent: true` (`capacitor.config.ts:9-10`).
  - A user-selectable server accepts any URL, including `http://` (`ServerSettings.tsx:43`; `client.ts:19-28`).
  - A LAN `http://` preset is offered (`ServerSettings.tsx:7`).
- Server-side, the session cookie `secure` flag depends on the request protocol (`server/_core/cookies.ts:11-48`). This is not used by the mobile bearer flow.

**Encryption at rest**
- The token is in plain SharedPreferences / UserDefaults. The README admits it is "not encrypted" and suggests Keychain/Keystore (`mobile/README.md:57`). `docs/MOBILE_API.md:12` recommends secure storage, but the app does not follow it (`AuthContext.tsx:20`).
- `allowBackup="true"` means the token may be included in Android backups (`AndroidManifest.xml:5`).
- Server database and S3 encryption at rest: NOT FOUND IN CODE (depends on host).
- Passwords: hashed (scrypt), not reversible (`credentialAuth.ts:18-23`).

**Access control**
- Every résumé and photo query is scoped by `userId` (`db.ts:81-125`).
- **Photo files are not access-controlled.** `GET /manus-storage/*` has no auth check (`storageProxy.ts:6-55`). Anyone with the URL can fetch the image. The key contains a random `nanoid` plus an 8-char hash (`mobileApi.ts:185`; `storage.ts:39-44`), so it is unguessable but not private. URLs are also embedded in résumé data and the PDF render.
- PDF rendering and import endpoints are authenticated (`mobileApi.ts:134,167`). The **web** PDF endpoint `POST /api/resume/pdf` and `GET /api/resume/pdf/health` are **unauthenticated** (`resumePdf.ts:159-164`), though they only process the data supplied in the request.

**Hardcoded keys / secrets (locations only, no values)**
- No API keys or secrets are hardcoded in source (pattern search of `server/`, `client/src`, `mobile/src`, `shared/`, Android sources: no hits).
- **Insecure fallback:** if `JWT_SECRET` is unset, the session key falls back to a hardcoded dev string (`server/credentialAuth.ts:9`). If production were ever missing this variable, tokens would be forgeable.
- **Committed config:** `mobile/.env.production` and `mobile/.env.example` are tracked in git. They hold only the server URL.
- **Root `.env`** (keys `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `PORT`) exists on disk but is git-ignored (`.gitignore`) and not tracked. Rotate `JWT_SECRET` and the DB credential if this folder was ever shared.
- Developer LAN IP hardcoded: `mobile/src/components/ServerSettings.tsx:7`.

**Other**
- Upload validation: images are checked by magic bytes and size ≤2 MB (`server/routers.ts:21-32`). Import files are checked by MIME, extension, magic bytes and ≤8 MB (`resumeImport.ts:21-29`).
- Chrome is launched with `--no-sandbox` (`resumePdf.ts:21`).
- CORS is `*` (`mobileApi.ts:215`).
- Release build is not minified or obfuscated (`build.gradle:21`).

---

## 9. CHILDREN & SENSITIVE DATA

- **Child-directed features:** NOT FOUND IN CODE. There is no age gate, date-of-birth field, or parental consent flow, and no "children" wording anywhere in `mobile/src`.
- **Health data:** NOT FOUND IN CODE.
- **Financial or payment data:** NOT FOUND IN CODE.
- **Biometrics:** none. The camera is used to capture a headshot (a photo of the user's face), which is uploaded to the server. No face detection or analysis is performed (`files.ts`; `headshot.ts` only resizes).
- **Personal data that users may enter into résumés:** name, contact details, address-level location, photo, employment and education history including a free-text `grade`, and free-text description fields (`shared/resume.ts:42-62`). There is no field-level restriction. Users could type anything, including sensitive categories, into free-text fields.

---

## 10. AI FEATURES

- **The mobile app has no AI feature.** None of its code references an LLM, and no endpoint called by the app sends content to an AI service (`mobile/src/api/client.ts:77-106`; `server/mobileApi.ts` route list).
- **Template scaffolding exists but is unused by the app.** `server/_core/llm.ts` (`invokeLLM`), `imageGeneration.ts`, `voiceTranscription.ts`, `dataApi.ts`, `map.ts` and `notification.ts` are present. A repo-wide search found no caller in `server/routers.ts`, `server/mobileApi.ts` or any client page. The only references are the admin-only `notifyOwner` in `server/_core/systemRouter.ts:16-24` and the demo-only `AIChatBox` in `client/src/pages/ComponentShowcase.tsx:1409`.
- **Not AI, but content-parsing:** imported PDF/DOCX files are parsed by local libraries (`pdf-parse`, `mammoth`, OCR via `tesseract.js`) with rule-based section detection (`resumeImport.ts`). No third-party AI API is called by that code.
- Whether any production deployment wires up a hosted LLM: NOT FOUND IN CODE.

---

## 11. GOOGLE PLAY DATA SAFETY MAPPING

Based only on sections 1–10. "Shared" follows Google's definition (transfer to a third party). Transfer to a service provider that processes data on the developer's behalf is *not* "sharing". See the open questions in section 12 on the Manus host and Forge storage.

| Data type (Play category) | Collected? | Shared? | Purpose | Optional? | Encrypted in transit? |
|---|---|---|---|---|---|
| **Name** (Personal info) | Yes (`AuthPage.tsx:60`) | No (see note ¹) | Account management, App functionality | No (required to register) | Yes, HTTPS by default ² |
| **Email address** (Personal info) | Yes | No ¹ | Account management, App functionality | No | Yes ² |
| **User IDs** (Personal info) | Yes (internal account id, `users.id`) | No ¹ | Account management | No | Yes ² |
| **Password / credentials** | Yes (entered; stored only as a hash) | No | Account management | No | Yes ² |
| **Phone number** (Personal info) | Yes, *if user types it* into a résumé (`shared/resume.ts:46`) | No ¹ | App functionality | Yes | Yes ² |
| **Address / location text** (Personal info → "Address") | Yes, *if user types it* (`location` field; free text, not GPS) | No ¹ | App functionality | Yes | Yes ² |
| **Other personal info** (employment, education, skills, URLs) | Yes (résumé content) | No ¹ | App functionality | Yes | Yes ² |
| **Photos** (Photos and videos) | Yes (headshot upload) | No ¹ | App functionality | Yes | Yes ² |
| **Files and docs** (uploaded PDF/DOCX for import) | Yes, transmitted and processed, **not retained** (`mobileApi.ts:134-141`) | No | App functionality | Yes | Yes ² |
| **App activity / in-app actions** | **No** analytics in app | n/a | n/a | n/a | n/a |
| **Approximate / precise location (device)** | **No** (NOT FOUND IN CODE) | n/a | n/a | n/a | n/a |
| **Contacts, calendar, SMS, call log** | **No** | n/a | n/a | n/a | n/a |
| **Device or other IDs (Android ID, Ad ID)** | **No** in app code | n/a | n/a | n/a | n/a |
| **IP address** (transient) | Processed by the server for rate limiting (`mobileApi.ts:70`); persistence by host: unknown | Google Fonts also receives IP at runtime (`generated/resume.css:2`) | Security / fraud prevention | No | Yes (HTTPS) |
| **Crash logs / diagnostics** | **No** (NOT FOUND IN CODE) | n/a | n/a | n/a | n/a |
| **Financial / health / audio / messages** | **No** | n/a | n/a | n/a | n/a |

¹ Marked "No" on the basis that the server operator is the app's own service provider. If the Manus host or the Forge storage is a different legal entity that can use data for its own purposes, this changes. Confirm with the developer.
² HTTPS is the **default** only. The app also allows plain HTTP via the cleartext flags and the server picker (section 8). Google's "Data is encrypted in transit" answer should be Yes only if you remove or restrict cleartext in the release build.

**Also relevant to the Data Safety form**
- **Data deletion:** users can delete individual résumés but there is **no account or data deletion** mechanism (section 6). The form asks you to declare how users can request deletion.
- **Data handling:** all data leaves the device, because there is no offline storage of content.
- **Security practices:** passwords are hashed and API traffic is HTTPS by default. The session token is stored unencrypted on-device.

---

## 12. GAPS (confirm with the developer)

**Must resolve before publishing**
1. **Account and data deletion.** No endpoint or UI exists (section 6). Play requires an in-app deletion path *and* a web URL where deletion can be requested. Also decide what happens to photos in storage and in `resumePhotos`.
2. **Legal pages.** No Privacy Policy or Terms link exists anywhere in the app UI (grep found none in `mobile/src`). Play requires a policy URL, and an in-app link is expected.
3. **Cleartext traffic.** `usesCleartextTraffic="true"`, `cleartext: true` and `allowMixedContent: true` are set (section 8). Confirm whether these are meant to ship in release, since they affect the "encrypted in transit" declaration.
4. **Hidden server picker.** Users can point the app at an arbitrary server (section 4). Confirm this is intended for release, because it determines who the data controller is.
5. **`JWT_SECRET` fallback** (`credentialAuth.ts:9`). Confirm production sets `JWT_SECRET`.

**Facts only the developer can supply**
6. **Hosting.** Is `cvbuilder-2ad3qnae.manus.space` Manus-hosted? Under what terms and in which regions? Does the host log request IPs and bodies, and for how long?
7. **Database provider and region** (`DATABASE_URL` host), encryption at rest, backup retention.
8. **Photo storage backend.** Is `BUILT_IN_FORGE_API_URL` set in production (S3 via Forge), or is local disk used? Who operates it, where, and with what retention?
9. **OCR language data.** `createWorker("eng")` (`resumeImport.ts:49`) may download language data from a third-party CDN. Confirm whether production fetches it or uses the local `eng.traineddata`.
10. **Website analytics.** Is `VITE_ANALYTICS_ENDPOINT` (Umami) set for the production website? If the privacy policy covers the website too, it must say so (`client/src/main.tsx:13-14`).
11. **Data retention.** No retention or purge logic exists. Résumés, photos and accounts are kept indefinitely. Orphaned photos remain after résumé deletion. Confirm the stated policy.
12. **Operator identity.** Legal entity name, address, contact email and DPO/representative for the policy. (The `shoptechsystems` package prefix hints at a company name, but it is not stated anywhere.)
13. **Jurisdiction and governing law**, minimum age, and acceptable-use rules for the Terms. Nothing in code sets an age requirement.
14. **Backups.** Android Auto Backup is enabled (`AndroidManifest.xml:5`) and would include the on-device token. Confirm intent.
15. **Photo access model.** Photos are reachable by unauthenticated URL (section 8). The policy should not claim they are private unless this changes.
16. **Sign-out semantics.** Tokens remain valid server-side for 30 days after sign-out (`mobileApi.ts:121-122`). The policy and UI wording ("Your resumes stay safe in your account", `ProfilePage.tsx:19`) should not imply server-side revocation.
17. **Third-party processors list.** Google (Fonts) is confirmed from code. Add Manus, the DB host and the storage host once the answers above are known.
18. **iOS-only items.** `NSPhotoLibraryAddUsageDescription` is declared but unused (section 2). iOS App Privacy "nutrition labels" will need the same mapping as section 11.

**Inconsistencies noticed in the repo (not privacy-critical)**
- `mobile/README.md:55` still says the appId is `com.cvstudio.app`. The actual one is `com.shoptechsystems.penvita`.
- `mobile/README.md:59` says Android needs no extra permissions, which is consistent with the manifest.
- `ProfilePage.tsx:34` hardcodes "18" templates.
- `eng.traineddata` (5 MB) and `uploads/` (2 files) sit in the repo directory. `uploads/` and `.manus-logs/` are present on disk but not tracked in git. I did not open their contents. `.manus-logs/` holds `browserConsole.log`, `networkRequests.log` and `sessionReplay.log`, which could contain user data from a dev session. Check before sharing the folder.
