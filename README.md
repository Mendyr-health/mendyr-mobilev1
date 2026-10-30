# Mendyr Mobile

Dedicated Expo/React Native Android client for Mendyr home healthcare. This is an independent Git repository; the Next.js web project remains untouched.

## Web-app audit

The audited web project is Next.js 16.4 / React 19 / TypeScript / Tailwind 4. It is a two-sided marketplace: patients book home nurses, physiotherapists, caretakers, doctors, lab technicians, and baby-care specialists; professionals configure service area, services and hours, then accept and complete nearby visits.

Patient flow: service catalogue → address → India-time appointment → quote/nearby professionals → booking → status, cancellation and review. Patient account supports profile and address CRUD.

Professional flow: register → onboarding (profession, area/radius, services, timings) → request feed → accept → call/directions → check-in → complete/release → earnings dashboard. Web polling is 15 seconds for patient updates/requests and 30 seconds for professional bookings.

Audited API routes include `/auth/login`, `/auth/register`, `/auth/me`, `/auth/logout`, `/bookings`, `/bookings/quote`, `/bookings/{id}/cancel`, `/bookings/{id}/accept`, `/bookings/{id}/check-in`, `/bookings/{id}/check-out`, `/bookings/{id}/release`, `/reviews`, `/addresses`, `/services`, `/services/categories`, `/professionals/nearby`, `/professionals/onboard`, `/professionals/me`, and availability/services endpoints under `/professionals/me`.

The web client uses a Next `/api/v1` rewrite and httponly cookies. Login/register responses also contain tokens. This app stores only the access token in Expo SecureStore and sends `Authorization: Bearer …`. **Confirm backend bearer-token/CORS support before release**; no refresh-token behavior has been invented.

Brand tokens were extracted exactly: primary `#1262E2`, light `#63B0F2`, dark `#0F4ABF`, 50 `#EEF5FE`, background `#F7F9FC`. The original logo is reused at `assets/branding/mendyr.png`. The web loads Inter/Outfit via Next; no distributable font files were present, so native currently uses Android system type pending supplied/licensed fonts.

Web-only routing, HTML/Tailwind components, cookie proxy, browser location and desktop chrome were rebuilt as native concerns. No WebView is used.

## Implemented

- Native login, role registration, secure session restoration/logout.
- Patient dashboard, service selection, booking submission, saved addresses, booking statuses.
- Professional dashboard, request polling/acceptance, bookings, profile summary.
- Centralized typed API client, TanStack Query, brand theme, original logo, touch-sized controls and loading/error/success states.

The following audited workflows are not yet complete: native address editor/location, quote/nearby presentation, booking cancellation/review/details, professional onboarding, profile/services/availability editors, and visit check-in/out/release.

## Run

```bash
cp .env.example .env
npm install
npm run android
```

The checked-in example uses the deployed backend, `https://mendyr-backend-v1.fastapicloud.dev`. For an Android emulator with a local backend instead, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`. Restart Expo after changing `.env`.

Run `npm run typecheck`. Use `npm start` then press `a`, or scan the development-build/Expo Go QR code.

## Android builds

```bash
npx eas-cli build --platform android --profile development
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
```

Development/preview profiles generate APKs; production generates an AAB. Configure Android application ID, signing, and production API URL in EAS before release.

## GitHub Actions APK build

The workflow at `.github/workflows/android-apk.yml` starts an EAS `preview` build on every push to `main` or manually from the Actions tab. It creates an installable APK and the job output includes its Expo download URL.

Before the first run, configure EAS once from a trusted local machine: set an Android package name in `app.json`, run `npx eas-cli init`, and make one successful Android EAS build so signing credentials and `extra.eas.projectId` are saved. Then create a GitHub Actions repository secret named `EXPO_TOKEN` containing an Expo access token with permission to build this project. The token is never committed.

## Verification

`npm run typecheck` passes. `expo lint` created an ESLint config then encountered an Expo CLI module-resolution error although ESLint was installed; rerun after resolving the local Expo CLI/toolchain issue. No Android emulator, physical device, production backend, or EAS build was available, so those are not claimed as verified.
