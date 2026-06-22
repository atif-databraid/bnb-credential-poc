# Local TypeScript POC App

This folder contains a browser-based proof-of-concept implementation built from the architecture.

- Type: single-page TypeScript app
- Storage: browser `localStorage`
- Compute: local workflow engine for provisioning, offboarding, launch policy, and continuity checks

## Run

1. Install dependencies (only if you want tooling installed globally):

   ```bash
   cd poc-ts-app
   npm install
   ```

2. Compile TypeScript:

   ```bash
   npm run build
   ```

3. Start the Node-based HTTP server and open the URL:

   ```bash
   npm start
   ```

   Then open `http://127.0.0.1:4173`.

`localStorage` is keyed by `bb-credential-poc-state-v1`.

## What you can do

- Start on **Alex Map** to see how each screen maps to `R1`-`R7` and `N1`-`N6` from `source-material/requirements.md`.
- Add a teammate to multiple carriers in one request.
- Set per-carrier role and trust tier (Tier 1 / Tier 2 / Tier 3).
- Track lifecycle requests and tasks by adapter mode.
- Deprovision departing teammates and disable local credential/session artifacts.
- View continuity risks when a carrier lacks active primary/backup admins.
- Choose a signed-in user and launch only that user's own carrier access with MFA relay simulation and local audit trail capture.
- Search knowledge notes for carrier-specific access procedures.
- Open a signed-in user's selected carrier launch in a mock portal with basic mechanism variation (credentials, SSO, OTP).

## Local behavior notes

- Launches are intentionally browser-scoped: state, cached sessions, and vault artifacts are stored in `localStorage`.
- This keeps the POC safe and deterministic. The demo does not persist anything outside the browser and does not call real carrier endpoints.

## Demo path

1. Open **Alex Map** for the requirements-to-screen translation.
2. Use **Provision** to add a teammate once and select carriers, roles, and trust tiers.
3. Use **Pending** and **Requests** to show how carrier-specific API, portal, email/form, and manual work is tracked.
4. Use **Users** to offboard someone as an admin, or change **Signed in as** to demo a specific user's own carrier launch.
5. Use **Continuity** to show the admin-of-record risk controls.
