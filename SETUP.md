# GLITCH Setup Guide

## Prerequisites

- Node.js (v18 or later)
- Docker Desktop (for the database)
- Expo Go (on your mobile device) or Android Studio / Xcode (for emulators)

## Quick Start

1.  **Start the Database**:
    Make sure Docker Desktop is running, then run:
    ```bash
    docker compose up -d
    ```
    (If `docker compose` is not found, try `docker-compose up -d`)

2.  **Start the Server**:
    Open a new terminal and run:
    ```bash
    cd server
    npm install
    npm run dev
    ```
    The server works on port 3000.

3.  **Start the Mobile App**:
    Open another terminal and run:
    ```bash
    cd mobile
    npm install
    npm start
    ```
    Scan the QR code with Expo Go or press `a` for Android Emulator / `i` for iOS Simulator.

## Troubleshooting

- **Database Connection**: If the server fails to connect to the database, ensure Docker is running and the credentials in `server/.env` match `docker-compose.yml`.
- **Mobile Connection**: If the mobile app cannot connect to the server:
    - On **Android Emulator**, use `http://10.0.2.2:3000`.
    - On **Physical Device**, replace `localhost` in `mobile/App.tsx` with your computer's local IP address (e.g., `192.168.1.x`).
