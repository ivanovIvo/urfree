# URFree V5

URFree tracks smoke-free time, lifetime savings, available savings, and a euro-denominated project balance.

## Finance model

- **Lifetime savings** keep increasing and are never reduced.
- **Available savings** equal lifetime savings minus confirmed transfers.
- **Project balance** equals `initialBalance + adjustments + transfers`.
- All transfers are stored as integer euro cents in Netlify Blobs. The app does not use `localStorage`.
- Netlify Identity protects the API and keeps each user's ledger separate.

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

Open the address printed after `URFree local test` (normally `http://127.0.0.1:8888`). If that port is already occupied, the server automatically tries `8889`, `8890`, and so on. This mode simulates the authenticated Netlify API and saves test transfers in `.urfree-dev-data.json`; it never uses browser `localStorage`. Stop it with `Ctrl+C`.

Reset all local test transfers with:

```powershell
npm.cmd run dev:reset
```

For a full integration test with real Identity and Blobs, link the repository to a Netlify project with Identity enabled and run `npx netlify dev`.
