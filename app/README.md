# Live Workout App

This app gives live set-by-set workout guidance from the current training state.

## What it does

- previews today's full session before you start
- shows the current exercise and what is next
- tracks completed sets and reps
- runs rest timers between sets and between exercises
- captures end-of-session feedback
- generates markdown log output you can paste in chat or save under `logs/`

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

You can load the training state in two ways:

1. `Auto-load State File` (tries a hosted snapshot first, then falls back to `state/current-state.json` when running from the workspace)
2. `Choose State File` and select `state/current-state.json` (works from file open too)

## Hosting build

To generate a deployable static site artifact, run:

`powershell -ExecutionPolicy Bypass -File .\scripts\publish-static-site.ps1`

That creates `dist/static-site/` with:

- `index.html`
- `app.js`
- `styles.css`
- `data/current-state.json`

This keeps the hosted app self-contained without publishing the rest of the workspace.

## End of workout

At the end:

1. click `Generate Log Markdown`
2. click `Copy Log` and paste in chat, or `Download Log` and save into `logs/`
3. ask the agent to update state using that result

Use this message after pasting the output:

`Please log this and update the next-session targets conservatively.`