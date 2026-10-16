# ØBΛ Downloader

A premium, mobile-first downloader interface and Node.js API.

## Current status

- TikTok link handling via TikWM, including attempts to resolve supported TikTok short share links.
- Mobile-first responsive interface and installable PWA shell.
- Capacitor configuration and an Android APK build workflow.
- Instagram, YouTube, Facebook, X, Pinterest, Reddit, Snapchat and Threads are detected but **not yet enabled for downloading**. Do not advertise these as supported until an integration is implemented, tested, and compliant with each platform's terms and copyright rules.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000.

## Environment

- `PORT` (optional): hosting platform port; defaults to 3000.

## Deploy

Deploy this Node.js service on a Node.js-capable host. Set the install command to `npm install` and the start command to `npm start`. Configure a custom domain and HTTPS in the hosting provider's dashboard after verifying the service works.

## Android

The repository includes `capacitor.config.json` and a GitHub Actions workflow to generate a debug APK. The Android wrapper currently loads the hosted web app, so the website must be deployed before installing the APK. In GitHub, open **Actions**, run **Build Android APK**, then download the generated artifact named `oba-downloader-debug-apk`. Debug APKs are for testing, not Play Store release.

## Notes

- TikTok short-link resolution can still fail for some share URLs or if the upstream provider changes.
- Download only content you own or are authorized to save. Respect platform terms, creator rights, privacy, and DRM restrictions.
- Do not use this service to access private content or bypass access controls.
- This project is not affiliated with TikTok, Instagram, YouTube, Meta, X, Reddit, Pinterest, Snapchat, or Threads.
