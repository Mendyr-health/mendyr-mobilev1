# Mendyr Mobile

Expo (SDK 55) / React Native 0.83 client for Mendyr, the home-healthcare marketplace: patients
book verified nurses, physiotherapists and caregivers for home visits; professionals receive
requests nearby and run the visit. One app serves both roles.

## Stack

- **Expo Router** with route groups, native stack transitions and real bottom tabs
- **TanStack Query** for server state (cached data first, background refresh, polling that
  pauses when the app is backgrounded)
- **Server-driven config** from `GET /api/v1/configs/app` (see below)
- Inter (body) and Outfit (headings) via `@expo-google-fonts/*`; `expo-haptics` for press and
  tab feedback; Reanimated for sheets, toasts and press scale
- Tokens in Expo SecureStore (AsyncStorage on web); single-flight refresh in `src/lib/api.ts`

## Project structure

```
src/
  app/                       Routes only — each file re-exports a screen from src/features
    _layout.tsx              Providers, font/splash boot, maintenance/update gate, protected groups
    index.tsx                Redirects to welcome / login / patient home / pro dashboard
    (auth)/                  welcome (app.onboarding slides), login, register
    (patient)/(tabs)/        home, bookings, account
    (patient)/               service/[id], book, booking/[id], addresses, address-form, edit-profile,
                             my-documents
    (pro)/(tabs)/            dashboard, requests, visits, earnings, profile
    (pro)/                   visit/[id], availability, services, documents (KYC), onboard (finish profile)
    notifications.tsx        Inbox (both roles)
    support.tsx              Help, WhatsApp, call, FAQs, SOS (both roles)
  features/                  Screens and their data hooks, by feature
    app/ auth/ home/ catalog/ booking/ addresses/ account/ notifications/ support/ pro/
    documents/               Upload helper (pick → upload-url → PUT → record), viewer, KYC and
                             patient document screens
  components/                icons, tab bar and the UI kit (components/ui)
  config/                    Config types, bundled defaults, ConfigProvider + hooks
  i18n/                      en and hi string tables, I18nProvider
  theme/                     Design tokens and useTheme/makeStyles
  lib/                       api client, types, formatting (₹, IST), slots, linking, haptics
  hooks/                     useNow, useRefresh
  providers/auth.tsx         Session state, login/register/logout, session-expiry handling
```

Route groups are guarded with `Stack.Protected` on the signed-in user's role, so signing in,
signing out or a session expiring moves the user to the right place automatically.

## Config-driven behaviour

`ConfigProvider` loads the last cached bundle from AsyncStorage, then fetches
`/configs/app?role=patient|professional&platform=android|ios|web` in the background and again
whenever the app returns to the foreground. First paint never waits for it; missing keys fall
back to the bundled defaults in `src/config/defaults.ts` (identical to the backend registry).

| Key | Used for |
| --- | --- |
| `app.features` | `useFeature('…')`: reviews, visit PIN, SOS, live status timeline, female-professional preference, Hindi, patient documents (`prescription_upload`) |
| `app.theme` | Brand colours and card radius (`useTheme`) |
| `app.home` | Order and visibility of patient home sections |
| `app.banners` | Home carousel; `deeplink` is an in-app route (`/book`, `/book?service=<id>`, `/service/<id>`, `/support`, `/bookings`) or an https URL |
| `app.onboarding` | First-launch welcome slides |
| `app.copy` | Overrides any string key per locale (`en`, `hi`) |
| `app.support` | Phone, WhatsApp, email, hours, SOS and ambulance numbers, FAQs |
| `app.version` | Force update below `min_supported`, dismissible prompt below `latest` (compared with the app's `version`) |
| `app.maintenance` | Full-screen maintenance message with retry |
| `app.polling` | Refresh intervals (seconds) for live bookings, lists and pro requests |
| `booking.rules` | Slot picker (hours, step, lead time, horizon) and cancellation fee window |
| `booking.cancel_reasons` | Reasons in the patient cancel and pro release sheets |
| `pro.settings` | Radius options, default radius, languages, required KYC documents |

There is no push channel yet: the notifications inbox is polled at `app.polling.lists` and new
items (and, for professionals, new requests) show an in-app banner while the app is open.

## Documents

Files go straight to private storage: `features/documents/upload.ts` picks a file (camera,
photo library or PDF), shrinks large photos (~2000px long edge, JPEG 0.8), asks the API for a
presigned `upload-url`, `PUT`s the bytes with exactly the returned headers, then records the
`file_key`. `view_url`s last ~5 minutes, so document lists are always refetched and a link
older than a few minutes is refreshed before it opens (photos in an in-app viewer, PDFs in the
in-app browser). Professionals manage KYC documents from Profile and the dashboard; the patient
side (My documents, attaching to bookings) is behind `app.features.prescription_upload`.

## Run

```bash
cp .env.example .env
npm install
npm run android
```

`EXPO_PUBLIC_API_URL` points at the backend (the API prefix `/api/v1` is added by the client).
The example uses `https://mendyr-backend-v1.fastapicloud.dev`; for an Android emulator with a
local backend use `http://10.0.2.2:8000`. Restart Expo after changing `.env`.

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
```

Add dependencies with `npx expo install <pkg>` so versions match the SDK and
`package-lock.json` stays in sync (CI uses `npm ci`).

## Android builds

```bash
npx eas-cli build --platform android --profile development
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
```

Development/preview profiles produce APKs; production produces an AAB.

The workflow at `.github/workflows/android-apk.yml` starts an EAS `preview` build on every push
to `main` (or manually). It embeds `https://mendyr-backend-v1.fastapicloud.dev` as
`EXPO_PUBLIC_API_URL` unless a repository variable `MENDYR_API_URL` is set. `EXPO_PUBLIC_*`
values ship inside the app and must never contain secrets. The workflow needs an `EXPO_TOKEN`
repository secret.
