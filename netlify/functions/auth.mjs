import {
  getUser,
  login,
  logout,
  refreshSession,
  verifyRequestOrigin
} from "@netlify/identity";

const json = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" }
  });

export default async (request) => {
  try {
    if (request.method === "GET") {
      await refreshSession();
      const user = await getUser();
      return user
        ? json({ user: { id: user.id, email: user.email } })
        : json({ error: "Unauthorized" }, 401);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    verifyRequestOrigin(request);
    const body = await request.json();

    if (body.action === "login") {
      if (typeof body.email !== "string" || typeof body.password !== "string") {
        return json({ error: "Email and password are required" }, 400);
      }

      const user = await login(body.email.trim(), body.password);
      return json({ user: { id: user.id, email: user.email } });
    }

    if (body.action === "logout") {
      await logout();
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    const status = Number(error?.status || error?.statusCode) || 401;
    return json(
      { error: status === 401 ? "Invalid email or password" : "Authentication failed" },
      status >= 400 && status < 600 ? status : 500
    );
  }
};

export const config = { path: "/api/auth" };
