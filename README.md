# ØBΛ Downloader

A premium, mobile-first downloader interface and Node.js API.

## Current status

- TikTok link handling via TikWM, including attempts to resolve supported TikTok short share links.
- Mobile-first responsive interface and installable PWA shell.
- Capacitor configuration and an Android APK build workflow.
- TikTok uses the existing TikWM flow; its working code path is kept separate from the new integration.\n- Instagram, Facebook, Snapchat, YouTube and X can use a separately deployed, self-hosted Cobalt API through `COBALT_API_URL`. They are **not active until that engine is deployed and configured**, and still require real-link testing.\n- Pinterest, Reddit and Threads remain future integrations.\n- Cobalt is AGPL-3.0 licensed; if you deploy a modified Cobalt instance, follow its source-code and attribution obligations.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000.

## Environment

- `PORT` (optional): hosting platform port; defaults to 3000.\n- `COBALT_API_URL` (optional): base HTTPS URL of your own self-hosted Cobalt API instance. Leave unset until the engine is deployed.\n- `COBALT_API_KEY` (optional): instance key if your Cobalt deployment requires authentication.\n- `COBALT_AUTH_SCHEME` (optional): auth scheme for `COBALT_API_KEY`; defaults to `Api-Key`.

## Deploy

Deploy this Node.js service on a Node.js-capable host. Set the install command to `npm install` and the start command to `npm start`. Configure a custom domain and HTTPS in the hosting provider's dashboard after verifying the service works.

## Android

The repository includes `capacitor.config.json` and a GitHub Actions workflow to generate a debug APK. The Android wrapper currently loads the hosted web app, so the website must be deployed before installing the APK. In GitHub, open **Actions**, run **Build Android APK**, then download the generated artifact named `oba-downloader-debug-apk`. Debug APKs are for testing, not Play Store release.

## Notes

- TikTok short-link resolution can still fail for some share URLs or if the upstream provider changes.
- Download only content you own or are authorized to save. Respect platform terms, creator rights, privacy, and DRM restrictions.
- Do not use this service to access private content or bypass access controls.
- This project is not affiliated with TikTok, Instagram, YouTube, Meta, X, Reddit, Pinterest, Snapchat, or Threads.
