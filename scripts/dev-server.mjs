import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const HOST = "127.0.0.1";
const START_PORT = Number(process.env.URFREE_DEV_PORT) || 8888;
const MAX_PORT_ATTEMPTS = 10;
let activePort = START_PORT;
const ROOT = process.cwd();
const DATA_FILE = join(ROOT, ".urfree-dev-data.json");
const PUBLIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.js", "app.js"],
  ["/settings.js", "settings.js"],
  ["/style.css", "style.css"],
  ["/sw.js", "sw.js"],
  ["/auth-client.bundle.js", "auth-client.bundle.js"]
]);
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};

async function readState() {
  try {
    const state = JSON.parse(await readFile(DATA_FILE, "utf8"));
    return {
      version: 1,
      transfers: Array.isArray(state.transfers) ? state.transfers : [],
      processedUndoIds: Array.isArray(state.processedUndoIds)
        ? state.processedUndoIds
        : []
    };
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    return { version: 1, transfers: [], processedUndoIds: [] };
  }
}

async function saveState(state) {
  await writeFile(DATA_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function publicState(state) {
  return {
    userId: "local-test",
    transfers: state.transfers,
    allocatedCents: state.transfers.reduce(
      (sum, transfer) => sum + Number(transfer.amountCents || 0),
      0
    )
  };
}

function sendJson(response, value, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 50_000) throw new Error("Request is too large");
  }
  return JSON.parse(body || "{}");
}

async function handleFinance(request, response) {
  let state = await readState();

  if (request.method === "GET") {
    sendJson(response, publicState(state));
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, { error: "Method not allowed" }, 405);
    return;
  }

  const body = await readJson(request);

  if (body.action === "transfer") {
    const amountCents = Number(body.amountCents);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      sendJson(response, { error: "Invalid amount" }, 400);
      return;
    }

    if (!state.transfers.some((transfer) => transfer.id === body.id)) {
      state = {
        version: 1,
        processedUndoIds: state.processedUndoIds,
        transfers: [
          ...state.transfers,
          {
            id: String(body.id),
            amountCents,
            createdAt: new Date().toISOString()
          }
        ]
      };
      await saveState(state);
    }
  } else if (body.action === "undo") {
    const id = String(body.id || "");
    if (!state.processedUndoIds.includes(id)) {
      state = {
        version: 1,
        transfers: state.transfers.slice(0, -1),
        processedUndoIds: [...state.processedUndoIds, id].slice(-25)
      };
      await saveState(state);
    }
  } else {
    sendJson(response, { error: "Unknown action" }, 400);
    return;
  }

  sendJson(response, publicState(state));
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || `${HOST}:${activePort}`}`);

  if (url.pathname === "/api/finance") {
    await handleFinance(request, response);
    return;
  }

  if (url.pathname === "/api/auth") {
    sendJson(response, { user: { id: "local-test", email: "local@urfree.test" } });
    return;
  }

  const fileName = PUBLIC_FILES.get(url.pathname);
  if (!fileName) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const contents = await readFile(join(ROOT, fileName));
  response.writeHead(200, {
    "Content-Type": CONTENT_TYPES[extname(fileName)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  response.end(contents);
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);
    if (!response.headersSent) sendJson(response, { error: "Local server error" }, 500);
    else response.end();
  });
});

server.on("error", (error) => {
  if (
    error.code === "EADDRINUSE" &&
    activePort < START_PORT + MAX_PORT_ATTEMPTS - 1
  ) {
    const previousPort = activePort;
    activePort += 1;
    console.log(`Port ${previousPort} is busy; trying ${activePort}...`);
    server.listen(activePort, HOST);
    return;
  }

  console.error(`Unable to start the local server: ${error.message}`);
  process.exitCode = 1;
});

server.listen(activePort, HOST, () => {
  console.log(`URFree local test: http://${HOST}:${activePort}`);
  console.log("Press Ctrl+C to stop.");
});
