# Live Workout App

This app gives live set-by-set workout guidance from the current training state.

## What it does

- previews today's full session before you start
- shows the current exercise and what is next
- tracks completed sets and reps
- runs rest timers between sets and between exercises
- captures end-of-session feedback
- generates markdown log output you can paste in chat or save under `logs/`
- can save the loaded state and generated session log to cloud storage when the API is configured

## How to launch

Open `app/index.html` in a browser.

For easiest launch from this workspace, run:

`powershell -ExecutionPolicy Bypass -File .\scripts\start-workout-app.ps1`

That will start a local server and auto-open:

`http://localhost:8787/app/index.html`

It will also print:

- a LAN URL you can open from your phone on the same Wi-Fi
- a QR code image URL (and it will try to open it automatically)

Scan that QR code with your phone camera to load the app on your device.

To stop the server later, run:

`powershell -ExecutionPolicy Bypass -File .\scripts\stop-workout-app.ps1`

You can load the training state in three ways:

1. `Auto-load State File` (tries `/api/state/current` first, then falls back to the hosted snapshot and finally `state/current-state.json`)
2. `Choose State File` and select `state/current-state.json` (works from file open too)
3. `Save Loaded State To Cloud` after loading a JSON file, if the backend storage is configured

## Hosting build

To generate a deployable static site artifact, run:

`powershell -ExecutionPolicy Bypass -File .\scripts\publish-static-site.ps1`

That creates `dist/static-site/` with:

- `index.html`
- `app.js`
- `styles.css`
- `data/current-state.json`

This keeps the hosted app self-contained without publishing the rest of the workspace.

## API storage layer

This repository now includes an Azure Functions API in `api/`.

Current endpoints:

- `GET /api/state/current`
- `PUT /api/state/current`
- `POST /api/session-log`

The intended storage model is Azure Blob Storage.

Required app settings for the deployed API:

- `TRAINING_STORAGE_CONNECTION_STRING`
- `TRAINING_STATE_CONTAINER` (optional, defaults to `training-state`)
- `TRAINING_STATE_BLOB` (optional, defaults to `current-state.json`)
- `TRAINING_LOGS_CONTAINER` (optional, defaults to `training-logs`)

If blob storage is not configured yet:

- the hosted app will still fall back to the deployed static state snapshot
- cloud save actions will fail with a clear error message

## Azure Static Web Apps

This repository now includes a GitHub Actions workflow at `.github/workflows/azure-static-web-apps.yml`.

The deploy flow is:

1. GitHub Actions runs `scripts/publish-static-site.ps1`
2. the workflow deploys `dist/static-site/` and `api/` to Azure Static Web Apps
3. the hosted app auto-loads `/api/state/current` when available

To finish the Azure setup:

1. create an Azure Static Web App connected to this GitHub repository and the `main` branch
2. add the deployment token to the repository as `AZURE_STATIC_WEB_APPS_API_TOKEN`
3. push to `main` or run the workflow manually

`app/staticwebapp.config.json` disables caching for the embedded state snapshot so state updates are picked up reliably after deployment.

## End of workout

At the end:

1. click `Generate Log Markdown`
2. click `Save Log To Cloud` if the API is configured
3. or click `Copy Log` and paste in chat, or `Download Log` and save into `logs/`
4. ask the agent to update state using that result

Use this message after pasting the output:

`Please log this and update the next-session targets conservatively.`