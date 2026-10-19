# CV Studio Mobile

Ionic React + Capacitor app for iOS and Android. It talks to the same server and database as the website through the REST API in [docs/MOBILE_API.md](../docs/MOBILE_API.md), so accounts, resumes and photos are shared with the website.

## What it does

| Screen | Features | API used |
|---|---|---|
| Sign in / Create account | Email + password; stays signed in for 30 days and refreshes automatically | `/auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/me` |
| My resumes | List with live thumbnails, pull to refresh, create, import a PDF/DOCX, duplicate, delete, download PDF | `/resumes`, `/resumes/import`, `/resumes/{id}/duplicate`, `DELETE /resumes/{id}`, `/resumes/{id}/pdf` |
| Editor › Edit | Every resume section, the same bold / italic / sub-heading / bullet formatting as the website, reorder or hide sections, headshot. Autosaves. | `GET`/`PATCH /resumes/{id}`, `/photos` |
| Editor › Preview | The website's real template rendering | — |
| Editor › Design | All 18 templates with thumbnails, accent colour, font, density, photo shape, ATS mode; download any template as PDF | `/templates`, `/resumes/{id}/pdf?template=` |
| Photos | Take or choose a headshot (resized automatically), see past uploads | `/photos` |
| Account | Profile and sign out | `/auth/logout` |

## Shared with the website

The app imports code from the website rather than copying it, so the two stay in sync:

- [`shared/resume.ts`](../shared/resume.ts): resume types, the template list and data normalisation.
- [`ResumeDocument.tsx`](../client/src/components/resume/ResumeDocument.tsx): the resume itself, so the preview is identical to the website and its PDF.
- [`richText.ts`](../client/src/lib/richText.ts) and [`headshot.ts`](../client/src/lib/headshot.ts): the Bold button logic and photo resizing.
- **Template styles:** `npm run resume-css` (run automatically by `dev` and `build`) copies the resume rules out of the website's stylesheets into `src/generated/resume.css`. A template added on the website therefore appears in the app on the next build.

## Run it

Install dependencies with `pnpm install` inside `mobile/`. Then point the app at a server by copying `.env.example` to `.env` and setting `VITE_API_URL`:

| Where it runs | `VITE_API_URL` |
|---|---|
| Browser on this computer | `http://localhost:3000` (start the website's dev server first) |
| Phone or emulator | Your deployed site, `https://<your-domain>`. Phones block plain `http` and can't reach your computer's `localhost`. |

```bash
pnpm dev        # in the browser at http://localhost:5173 (use the browser's phone view)
pnpm test       # unit tests
pnpm android    # build, sync and open Android Studio, then press Run
pnpm ios        # build, sync and open Xcode, then press Run
```

### Requirements

- **iOS:** builds need full **Xcode** from the App Store; this Mac currently has only the Command Line Tools.
- **Android:** builds need **Android Studio**.
- **Node:** the Capacitor CLI needs **Node 22+**. The `cap`, `sync`, `ios` and `android` scripts fetch a temporary Node 22 through `npx`, so you don't have to upgrade your system Node (20). Everything else runs on Node 20.
- **After changes:** after changing app code, run `pnpm sync` before rebuilding in Xcode or Android Studio.

## Before publishing to the stores

- Set `VITE_API_URL` in `.env` to the production domain, and make sure **Download PDF works on the live site**: PDF export needs Chrome on the server.
- Change `appId` (`com.cvstudio.app`) in `capacitor.config.ts` to the bundle ID you register with Apple and Google. Then delete the `ios/` and `android/` folders and re-run `pnpm cap add ios` and `pnpm cap add android`, because the ID is baked into the native projects.
- Add app icons and splash screens, for example with `npx @capacitor/assets generate`.
- The sign-in token is stored with `@capacitor/preferences`, which is not encrypted. For extra protection, swap [`src/auth/AuthContext.tsx`](src/auth/AuthContext.tsx) to a Keychain/Keystore plugin such as `@aparajita/capacitor-secure-storage`. Only the `persist` and restore functions need to change.
- The camera and photo-library permission messages are in `ios/App/App/Info.plist`. Android uses the system photo picker and needs no extra permissions.
