# Mandi Dost – mobile app (React Native + Expo)

The Android-first mobile app. It talks to the Mandi Dost .NET API, which lives in its own repo (`backend`).

## Run it on your Android phone

1. On the phone, install **Expo Go** from the Play Store.
2. Connect the PC and the phone to the **same Wi-Fi**.
3. Start the API (from the `backend` repo) so the phone can reach it:
   ```bash
   cd src/MandiDost.Api
   dotnet run --launch-profile lan      # listens on http://0.0.0.0:5080
   ```
   On Windows you can double-click `start-backend.cmd` in the backend repo instead.
4. In `mobile/.env`, set the PC's Wi-Fi IP (run `ipconfig` to find it):
   ```
   EXPO_PUBLIC_API_URL=http://192.168.100.68:5080
   ```
5. Start the app:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
6. Scan the QR code with Expo Go.

If the phone can't connect, Windows Firewall is probably blocking it. When Windows asks, allow **Node.js** and **dotnet** on private networks, or allow ports 8081 and 5080.

Browser preview, for quick checks on the PC: `npx expo start --web`, then open http://localhost:8081.

## Checks

```bash
npx tsc --noEmit    # types
npx expo lint       # lint
```

## Structure

```
src/app/            screens (Expo Router: every file is a route)
  (tabs)/           Home · Explore · Sell · Messages · Profile
  feed/[section]    Qurbani / restaurant / livestock / crops / supplies pages
  login, register
src/components/     shared UI (Txt auto-translates, Button, Field, Sheet…)
src/lib/            API client (JWT + refresh), session, secure storage
src/i18n/           Urdu → Punjabi / Saraiki dictionaries (drafts, need native review)
src/data/sections   the five marketplace sections
```

## Notes

- **Right-to-left layout:** the whole app is RTL through the root view's `direction: 'rtl'`. The `expo-localization` plugin also sets `forcesRTL` for production builds.
- **Expo SDK 58** asks for Node 22.13 or newer. This PC has 22.12, which works but prints a warning, so update Node when convenient.
- **Voice search** needs a speech-to-text module that Expo Go doesn't include. It comes with a development build later.
