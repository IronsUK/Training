# Training App Project Plan

## Purpose

This document tracks the current status, roadmap, decisions, and next actions for the hosted training app.

Use it as the main project coordination file for future chat sessions.

## Current Outcome

- The training app is hosted in Azure Static Web Apps.
- The source is in GitHub: `https://github.com/IronsUK/Training`
- The current deployment model is static.
- The app works today for loading a deployed training-state snapshot and running a session.

## Current Architecture

- Frontend host: Azure Static Web Apps
- Source control: GitHub
- Deployment: GitHub Actions workflow
- State source in production: deployed snapshot of `state/current-state.json`
- Session logging: markdown generation in browser, then manual handling
- AI assistant: not yet built into the app
- Speech output: not yet implemented
- Speech input: not yet implemented

## Environment

- Azure subscription: Visual Studio Enterprise Subscription
- Resource group: `rg-training-app-uksouth`
- Static Web App name: `ironsuk-training-app`
- Static Web App region: `West Europe`
- Storage account: `ironsuktrain0525`
- Storage region: `UK South`

## Live URL

- Default hostname: `https://orange-cliff-0af49de03.7.azurestaticapps.net`

## Project Status

| Area | Status | Notes |
| --- | --- | --- |
| GitHub repo created | Done | Repository initialized and pushed |
| Azure hosting | Done | Static Web App is live |
| CI/CD workflow | Done | GitHub Actions deploys the static artifact |
| Static state deployment | Done | Hosted app loads a published state snapshot |
| In-app persistent state | In progress | API-backed read/write path being added |
| In-app log persistence | In progress | API-backed log storage being added |
| Training assistant in app | Not started | Future LLM/agent capability |
| Text-to-speech workout guidance | Not started | Candidate for browser speech or Azure Speech |
| Speech-to-text input | Not started | Stretch goal |

## Confirmed Decisions

- Azure Static Web Apps is the correct first hosting step.
- Static Web Apps is being used as the frontend host, not the final full-system architecture.
- The current app remains simple and static-first while the hosted baseline is stabilized.
- Future state and log persistence should move out of Git-tracked files and into a backend or cloud storage layer.

## Current Limitation

The hosted app currently depends on a deployed copy of `state/current-state.json`.

That means:

- if the workout state changes and the hosted app must reflect it automatically, a repo update and redeploy is currently required
- the app does not yet persist workout results directly to cloud storage
- the app does not yet update next-session targets on its own

## Roadmap

### Phase 1: Hosted Baseline

Goal: have the current app running reliably on Azure.

Status: Done

Scope completed:

- create GitHub repository
- add deployment workflow
- add static publish script
- deploy to Azure Static Web Apps

### Phase 2: Dynamic State And Log Storage

Goal: remove the need to push changes to refresh workout state.

Status: In progress

Target outcomes:

- app loads current state from an API or cloud storage instead of deployed static JSON
- app persists workout logs directly to the cloud
- state updates no longer require Git commits
- workout logs are stored in a form the app can query later

Current implementation slice:

- Azure Functions API added to the repo
- frontend updated to prefer `/api/state/current`
- manual cloud-save actions added for loaded state and generated logs
- Azure Blob Storage wiring has been provisioned in Azure and seeded with the current state snapshot
- code still needs to be pushed before the hosted app can use the new API path
- historical markdown logs have been imported into blob storage

Likely implementation options:

- Azure Functions plus Blob Storage
- Azure Functions plus Cosmos DB
- Container Apps or App Service if the backend grows quickly

Recommended starting direction:

- keep Static Web Apps for the frontend
- add a minimal backend for reading and writing workout state
- keep progression logic deterministic before adding an LLM-driven update path

### Phase 3: Embedded Training Assistant

Goal: move current chat-based coaching tasks into the app.

Status: Planned

Target outcomes:

- answer training questions in app
- explain exercises and workout choices
- review session outcomes
- propose conservative plan updates
- inspect stored workout logs and answer questions about training history

Likely services:

- Azure OpenAI or Microsoft Foundry agent
- backend tool layer for reading and updating workout state and logs

Guardrail note:

- plan mutation should be constrained by deterministic rules and approval logic, not left fully open-ended to the model

### Phase 4: Speech Output

Goal: let the app talk through the workout.

Status: Planned

Target outcomes:

- spoken exercise prompts
- spoken rest countdown cues
- spoken form reminders

Likely implementation options:

- browser speech synthesis for fast initial delivery
- Azure Speech for higher quality and more control

### Phase 5: Speech Input

Goal: allow voice-driven interaction during the workout.

Status: Stretch

Target outcomes:

- log reps by voice
- control workout flow with short commands
- ask the assistant questions without typing

Known complexity:

- speech recognition reliability
- noisy workout environment
- intent parsing and confirmation flows

## Near-Term Backlog

- design the minimal backend/data architecture
- choose storage model for current state and logs
- define the first API surface
- update the frontend to load dynamic state
- update the frontend to save completed session results
- define how workout logs will be queried in app
- define the stored log shape needed for future AI retrieval and inspection
- add a one-time historical log import from `logs/` into cloud storage
- preserve original markdown and store structured JSON alongside it
- flag logs that do not parse cleanly during migration

## Candidate First API Surface

- `GET /api/state/current`
- `POST /api/session-log`
- `POST /api/state/update-from-session`
- `GET /api/session-log`
- `GET /api/session-log/search`
- `POST /api/assistant/chat`

These are placeholders, not final contracts.

## Open Questions

- Should workout state live in Blob Storage first, or go straight to Cosmos DB or SQL?
- Should progression updates be fully deterministic at first, with the LLM used only for explanation?
- When voice is added, should the first version support only a small command set?
- Will authentication be required for personal-only use, or can the first backend be unauthenticated and private by obscurity during prototyping?
- Is Blob Storage alone enough for log querying, or should logs move to a query-friendly store once in-app history and AI inspection are added?

## Next Recommended Step

Build the smallest backend that removes dependence on Git-tracked state updates.

That means:

1. introduce a minimal API for reading current state
2. store current state outside the repo
3. wire the hosted frontend to that API
4. then add session-log persistence

After that:

1. add a query path for recent and filtered workout logs
2. ensure stored logs include enough structure for AI inspection
3. add an assistant endpoint that retrieves current state and relevant logs before answering
4. migrate the historical markdown logs so query and AI features have full training history

## Session Notes

### 2026-05-25

- GitHub repository created and connected
- Azure Static Web App created and verified live
- Static deployment pipeline is working
- Current hosted app is functional
- Next architectural step identified: move state and logs behind a backend
- Phase 2 implementation started with API-backed state and log endpoints
- Storage account created and initial `current-state.json` uploaded to blob storage
- Historical log migration and query endpoints added to the Phase 2 plan
- Existing markdown logs imported into `training-logs` and validated through the new query layer