# URFree V5

URFree tracks smoke-free time, lifetime savings, available savings, and a euro-denominated project balance.

## Finance model

- **Lifetime savings** keep increasing and are never reduced.
- **Available savings** equal lifetime savings minus confirmed transfers.
- **Project balance** equals `initialBalance + adjustments + transfers`.
- All transfers are stored as integer euro cents in Netlify Blobs. This server ledger is the source of truth.
- Netlify Identity protects the API and keeps each user's ledger separate.

The browser keeps a read-only snapshot of the last server-confirmed ledger in `localStorage`. It is used only to render the last known values while offline or while Netlify is temporarily unavailable. Failed transfers are never added to that snapshot. A successful server sync always replaces it.

## Sessions and offline behavior

- Netlify Identity restores the existing session before the app decides whether login is required.
- An API `401` triggers one silent session refresh and one retry. The login form appears only if the retry also returns `401`.
- Network errors and Netlify `5xx` responses leave the authenticated UI and cached ledger visible with an offline/sync-later status.
- The app shell is cached by a service worker, so an iPhone Home Screen installation can reopen with the last confirmed ledger in airplane mode after it has loaded online at least once.
- Returning to the app, restoring it from Safari's page cache, or coming back online triggers a background sync. Netlify Blobs wins whenever the server is reachable.
- Invite, confirmation, and recovery links are processed before the normal login screen. Invitation registration remains **Invite only** in Netlify.

Edit the project in `settings.js`:

```js
project: {
  initialBalance: -998.00,
  adjustments: [
    { date: "2026-09-24", amount: -20.00 }
  ]
}
```

A negative adjustment increases the outstanding balance. A positive adjustment reduces it. Future-dated adjustments take effect at midnight in the configured timezone.

## Deploy to Netlify

1. Import this Git repository as a new Netlify project. `netlify.toml` already contains the publish and Functions settings.
2. In **Project configuration → Identity**, enable Identity.
3. Set registration to **Invite only** and invite the email address that will use the app.
4. Deploy the project and follow the invitation link to set a password.
5. Sign in from the app. Transfers will now follow the account across phones and browser reinstalls.

## Local test before Netlify

Install dependencies once and start the included local test server:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the address printed after `URFree local test` (normally `http://127.0.0.1:8888`). If that port is already occupied, the server automatically tries `8889`, `8890`, and so on. This mode simulates the authenticated Netlify API and saves the server-side test ledger in `.urfree-dev-data.json`. The browser also keeps the same disposable last-known snapshot used in production. Stop it with `Ctrl+C`.

To test offline behavior, first load the page online once and wait for the finance sync. Then enable airplane/offline mode in the browser's developer tools and reload. The UI and last confirmed amounts should remain visible; a transfer attempt should show `offline · retry` and must not change the displayed balances.

Reset all local test transfers with:

```powershell
npm.cmd run dev:reset
```

For a full integration test with real Identity and Blobs, link the repository to a Netlify project with Identity enabled and run `npx netlify dev`.
