# Deployment Guide for GLITCH

This guide covers how to deploy the GLITCH backend (Node.js + PostgreSQL) and the mobile app (Expo).

## Backend Deployment

We recommend **Railway** or **Render** for the easiest setup. Both offer PostgreSQL databases and Node.js hosting.

### Option A: Deploy on Railway (Recommended)

1.  **Sign up** at [railway.app](https://railway.app).
2.  **Create a New Project** -> "Deploy from GitHub repo".
3.  Select your `glitch` repository.
4.  **Add a Database**:
    *   Right-click in the project canvas -> "New Service" -> "Database" -> "PostgreSQL".
5.  **Configure Environment Variables**:
    *   Click on your Node.js service -> "Variables".
    *   Add the following variables (you can get DB credentials from the PostgreSQL service "Connect" tab):
        *   `DATABASE_URL`: `${Postgres_Connection_URL}` (Railway provides this automatically if you link variables, often as `DATABASE_URL` or `POSTGRES_URL`).
        *   `JWT_SECRET`: Generate a strong random string (e.g., `openssl rand -hex 32`).
        *   `PORT`: Railway sets this automatically (usually `PORT`).
6.  **Build Command**: Railway detects `package.json`. Ensure the start command is `npm start` (which runs `node dist/index.js`).
    *   For the build command, Railway might auto-detect `npm run build`. If not, set it to `cd server && npm install && npm run build`.
    *   **Root Directory**: Set this to `server` in the settings, as your backend code is in the server folder.

### Option B: Deploy on Render

1.  **Sign up** at [render.com](https://render.com).
2.  **Create a PostgreSQL Database**:
    *   "New" -> "PostgreSQL".
    *   Name it `glitch-db`.
    *   Copy the `Internal Database URL` (for when deploying the backend on Render) or `External Database URL` (for local access).
3.  **Create a Web Service**:
    *   "New" -> "Web Service".
    *   Connect your GitHub repo.
    *   **Root Directory**: `server`.
    *   **Build Command**: `npm install && npm run build`.
    *   **Start Command**: `npm start`.
4.  **Environment Variables**:
    *   Add `DATABASE_URL`: Paste the Internal Database URL from step 2.
    *   Add `JWT_SECRET`: Any random secure string.

## Mobile App Deployment (Expo)

To distribute your app, you'll use EAS (Expo Application Services).

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Configure Project
Run this in the `mobile` directory:
```bash
cd mobile
eas build:configure
```

### 4. Set Environment Variables
Update your `eas.json` or connection settings to point to your **deployed backend URL**.
You should set `EXPO_PUBLIC_API_URL` to your production server URL (e.g., `https://glitch-server.up.railway.app`).

Example `eas.json` configuration for production:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-backend-url.com"
      }
    }
  }
}
```

### 5. Build for Production
To build an Android APK or iOS IPA:
```bash
eas build --profile production --platform all
```

### 6. Submit to Stores
Once built, you can submit to the App Store and Google Play Store:
```bash
eas submit -p all
```

## Running locally with Production Backend
If you want to test the app on your phone while pointing to the production server:
1.  Create a `.env` in `mobile/` with:
    ```
    EXPO_PUBLIC_API_URL=https://your-production-url.com
    ```
2.  Run `npx expo start`.
