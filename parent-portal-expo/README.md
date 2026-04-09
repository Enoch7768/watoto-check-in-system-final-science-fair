# Parent Portal Mobile App (Expo)

This is the standalone mobile version of the Parent Portal, built with React Native and Expo. It is designed to run on iOS, Android, and the Web.

## Setup

1. Make sure you have Node.js installed.
2. Install the Expo CLI globally (optional but recommended):
   ```bash
   npm install -g expo-cli
   ```
3. Open a terminal in this directory (`parent-portal-expo`).
4. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit the `.env` file and set `EXPO_PUBLIC_API_BASE_URL` to the URL of your main application's backend API.
   - For Android Emulator: `http://10.0.2.2:3000`
   - For iOS Simulator: `http://localhost:3000`
   - For physical devices on the same Wi-Fi: `http://<YOUR_COMPUTER_IP>:3000`
   - For production: `https://your-main-app-domain.com`

## Running the App

To start the Expo development server:
```bash
npm start
```

From there, you can press:
- `a` to open in Android Emulator
- `i` to open in iOS Simulator
- `w` to open in a web browser
- Or scan the QR code with the Expo Go app on your physical device.

## Building Standalone Apps (APK / iOS)

To build a standalone app (like an Android `.apk` or an iOS app) using your Expo account, we use **EAS (Expo Application Services)**.

1. Install the EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Initialize the project with EAS (this links it to your Expo dashboard):
   ```bash
   eas build:configure
   ```

### Build an Android APK
To generate an `.apk` file that you can install directly on any Android device:
```bash
eas build -p android --profile preview
```
*When the build finishes, EAS will provide a link to download your `.apk` file.*

### Build for iOS
To build for iOS, you must have an Apple Developer account:
```bash
eas build -p ios
```
*Note: iOS builds require you to log in with your Apple ID during the build process to provision the certificates.*
