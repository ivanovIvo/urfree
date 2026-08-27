import { getStore } from "@netlify/blobs";
import { getUser, refreshSession, verifyRequestOrigin } from "@netlify/identity";

const STORE_NAME = "urfree-finance";
const EMPTY_STATE = Object.freeze({ version: 1, transfers: [] });

const json = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" }
  });

function publicState(state) {
  const transfers = Array.isArray(state?.transfers) ? state.transfers : [];
  return {
    transfers,
    allocatedCents: transfers.reduce((sum, item) => sum + item.amountCents, 0)
  };
}

async function updateState(store, key, mutate) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const entry = await store.getWithMetadata(key, { type: "json" });
    const current = entry?.data || EMPTY_STATE;
    const next = mutate(current);
    const options = entry
      ? { onlyIfMatch: entry.etag }
      : { onlyIfNew: true };
    const result = await store.setJSON(key, next, options);

    if (result.modified) return next;
  }

  throw new Error("Concurrent update conflict");
}

export default async (request) => {
  try {
    // Keep a returning browser/Home Screen session alive using Netlify's
    // long-lived refresh cookie. The user only needs to enter the password
    // again if the refresh session has expired, been revoked, or they sign out.
    await refreshSession();
    const user = await getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    const key = `users/${user.id}.json`;

    if (request.method === "GET") {
      const state = (await store.get(key, { type: "json" })) || EMPTY_STATE;
      return json(publicState(state));
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    verifyRequestOrigin(request);
    const body = await request.json();

    if (body.action === "transfer") {
      const amountCents = Number(body.amountCents);
      const lifetimeCents = Number(body.lifetimeCents);
      const id = String(body.id || "");

      if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > 100_000_000) {
        return json({ error: "Invalid amount" }, 400);
      }
      if (!Number.isSafeInteger(lifetimeCents) || lifetimeCents < amountCents) {
        return json({ error: "Invalid lifetime balance" }, 400);
      }
      if (!/^[a-zA-Z0-9-]{16,80}$/.test(id)) {
        return json({ error: "Invalid transfer id" }, 400);
      }

      const state = await updateState(store, key, (current) => {
        const transfers = Array.isArray(current.transfers) ? current.transfers : [];
        if (transfers.some((item) => item.id === id)) return current;
        const allocated = transfers.reduce((sum, item) => sum + item.amountCents, 0);
        if (allocated + amountCents > lifetimeCents) {
          const error = new Error("Insufficient available balance");
          error.status = 409;
          throw error;
        }

        return {
          version: 1,
          transfers: [
            ...transfers,
            { id, amountCents, createdAt: new Date().toISOString() }
          ]
        };
      });

      return json(publicState(state));
    }

    if (body.action === "undo") {
      const state = await updateState(store, key, (current) => ({
        version: 1,
        transfers: (Array.isArray(current.transfers) ? current.transfers : []).slice(0, -1)
      }));
      return json(publicState(state));
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    const status = Number(error?.status) || 500;
    return json(
      { error: status === 409 ? error.message : "Unable to save project data" },
      status
    );
  }
};

export const config = { path: "/api/finance" };
