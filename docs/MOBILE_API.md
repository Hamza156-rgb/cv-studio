# CV Studio Mobile API (v1)

REST API for the CV Studio mobile app. It runs on the same server and database as the website, so accounts and resumes are shared: a resume saved in the app appears on the website, and vice versa.

- **Base URL:** `https://<your-domain>/api/v1`
- **Full reference (OpenAPI 3.1):** `GET /api/v1/openapi.json`. Import it into Postman or Insomnia, or generate a typed client with `openapi-generator` (Swift, Kotlin, Dart) or `openapi-typescript` (React Native).
- **Code:** [server/mobileApi.ts](../server/mobileApi.ts) for the endpoints, [server/mobileApiSpec.ts](../server/mobileApiSpec.ts) for the spec, and [server/mobileApi.test.ts](../server/mobileApi.test.ts) for the tests.

## Authentication

1. `POST /auth/login` with `{ "email", "password" }`, or `POST /auth/signup` with `{ "name", "email", "password" }`.
2. Store the returned `token` in secure storage: Keychain on iOS, EncryptedSharedPreferences or Keystore on Android.
3. Send it on every request as `Authorization: Bearer <token>`.

Tokens last 30 days. To keep users signed in, call `POST /auth/refresh` (for example on app launch) while the token is still valid; it returns a new 30-day token. If any call returns `401`, send the user to the sign-in screen. Signing out means deleting the stored token.

After 10 failed sign-ins for the same email from the same IP within 15 minutes, `/auth/login` returns `429` until the window ends.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/templates` | Template catalog (id, name, category, `ats`, `supportsPhoto`). No auth needed. |
| POST | `/auth/signup` · `/auth/login` | Get a session `{ token, tokenType, expiresAt, user }` |
| POST | `/auth/refresh` | New 30-day token |
| GET | `/auth/me` | Current user |
| POST | `/auth/logout` | `204`; the app then deletes its stored token |
| GET · POST | `/resumes` | List resumes (newest first) · create `{ title, template, data? }` |
| GET · PATCH · DELETE | `/resumes/{id}` | Read · update `{ title?, template?, data? }` · delete |
| POST | `/resumes/{id}/duplicate` | Copy a resume |
| GET | `/resumes/{id}/pdf?template=` | PDF identical to the website preview. `template` is optional and renders another layout without saving it. |
| POST | `/resumes/import` | Parse a PDF or DOCX `{ fileName, dataUrl }` into resume data. It does not save; follow with `POST /resumes`. |
| GET · POST | `/photos` | List headshots · upload `{ fileName, dataUrl }` (JPG/PNG/WebP, max 2 MB) |

Notes:
- **Files** are sent as base64 data URLs inside JSON, for example `data:image/jpeg;base64,…`. Resize photos to about 800 px before uploading, as the website does.
- **Photos:** to put a photo on a resume (a new upload or one from `GET /photos`), store its `storageUrl` in `data.photoUrl`. The website and the PDF renderer need that site-relative address. Use `photo.url`, which is absolute, to display the image in the app.
- **`PATCH` with `data`** replaces the whole resume content. Send the complete object you got from `GET`, with your edits applied.
- **Text fields** use the same light markdown as the website editor: `**bold**`, `*italic*`, lines starting `- ` or `1. `, and a line that is entirely `**bold**` becomes a sub-heading.

## Errors

Every error has the same shape. Show `message` to the user.

```json
{ "error": { "code": "NOT_FOUND", "message": "This resume was not found." } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Invalid input. `details` lists each field problem as `{ path, message }`. |
| 401 | `UNAUTHORIZED` | Missing, invalid or expired token, or wrong password |
| 404 | `NOT_FOUND` | Unknown resume (or one belonging to another user), or unknown endpoint |
| 409 | `CONFLICT` | Sign-up with an email that already has an account |
| 413 | `PAYLOAD_TOO_LARGE` | Request body over 50 MB |
| 429 | `TOO_MANY_REQUESTS` | Sign-in lockout, or the PDF service is busy (retry after a few seconds) |
| 500 | `INTERNAL` | Unexpected server error |

## Quick test with curl

```bash
BASE=https://<your-domain>/api/v1
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"your-password"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s $BASE/resumes -H "Authorization: Bearer $TOKEN"
curl -s $BASE/resumes/15/pdf -H "Authorization: Bearer $TOKEN" -o resume.pdf
```
