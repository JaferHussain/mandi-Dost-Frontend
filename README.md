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

## Listen, speak and alerts

- **Listen** (yellow speaker) and **Speak** (green microphone) are in the header of every page. Listen reads the important facts of the page aloud in Urdu; Speak opens "speak to the app".
- **Speak to the app:** say or type a sentence ("میرے پاس دو ساہیوال گائے ہیں، 80 ہزار روپے فی جانور، لودھراں"). The app shows what it understood, reads it back, and opens the sell form, the requirement form or the search with those answers filled in. **Nothing is published until the user presses the normal publish button.**
- **Turning speech into text** needs the server's speech service (see the backend README). Without it, the sheet says so and the user types or uses the phone keyboard's own microphone. In Chrome on the web preview the browser's recogniser is used. Voice on phones has not been tested on a real device yet.
- **Alerts:** the app checks for new alerts every 25 seconds while it is open (and when it comes to the front). A popup appears at the top with a speaker button; the bell shows unread alerts. Phone push alerts for a closed app are not built yet (they need Firebase and a Play Store build).

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
- **Phone push notifications and on-device speech recognition** need a development or Play Store build; Expo Go doesn't include them.
