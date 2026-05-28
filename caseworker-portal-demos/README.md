# Caseworker portal demos

Interactive demos of the Safety Net Blueprint from a caseworker's perspective. Each demo targets a specific state or county system and uses the blueprint's mock server to demonstrate real API behavior — including intake, workflow tasks, and domain events.

## Prerequisites

- Node.js 18+
- The [safety-net-blueprint](https://github.com/codeforamerica/safety-net-blueprint) repo cloned as a sibling directory:
  ```
  ~/your-work/
    safety-net-blueprint/
    safety-net-harness/       ← this repo
  ```
  If it's elsewhere, set `BLUEPRINT_DIR` (see below).

## Setup and run

### 1. Install dependencies

```bash
cd caseworker-portal-demos
npm install
```

### 2. Start the mock server and seed demo data

```bash
node run.mjs --demo=<name>
```

This resolves any overlays for the demo, starts the mock server on port 1080, and seeds the demo scenario.

If your blueprint repo is not a sibling directory:

```bash
BLUEPRINT_DIR=/path/to/safety-net-blueprint node run.mjs --demo=<name>
```

### 3. Start the app

```bash
npm run dev
```

Open [http://localhost:5174](http://localhost:5174).

### 4. Tear down

```bash
node run.mjs --demo=<name> --teardown
```

Stops the mock server and removes generated files.

## Using the app

1. The queue page shows pending workflow tasks from the mock server.
2. Click **Claim** to assign a task to the active user and open the associated application.
3. The review page shows the application summary with real data. Fields marked **TBD** are blueprint design gaps — places where the baseline contract doesn't yet cover the data a real system would need.
4. Use the **Admin** button (bottom right) to:
   - Switch the active user
   - Reset and reseed the demo to its initial state
   - Inspect domain events emitted during the session

## Adding a demo

Each demo lives under `data/<name>/` and needs:

| File/folder | Purpose |
|---|---|
| `demo.json` | Demo name, description, and overlay config |
| `seeds/` | YAML fixture data loaded at server start |
| `overlays/` *(optional)* | OpenAPI overlays for system-specific fields |
| `seed.mjs` *(optional)* | Script for data that must go through the live state machine |

Run `node run.mjs --demo=<name>` to start it.

## Project structure

```
caseworker-portal-demos/
  data/                  # One subdirectory per demo
  src/
    api/                 # Generic fetch wrapper with default headers
    components/          # Shared UI components (DemoTray, DesignGap, ApplicationSections)
    context/             # DemoContext — active user and demo state
    hooks/               # useApiData — data fetching hook
    pages/               # QueuePage, ReviewPage
  run.mjs                # Setup/teardown runner
```
