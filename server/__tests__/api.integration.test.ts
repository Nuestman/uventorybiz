import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "http";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("API integration", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-secret";
    const { createTestApp } = await import("../test-app");
    const app = await createTestApp();
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    const port = typeof addr === "object" && addr?.port ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(() => {
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("returns 401 for protected route without auth", async () => {
    const res = await fetch(`${baseUrl}/api/patients`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for login with invalid credentials", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "nonexistent@example.com", password: "wrong" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for login with invalid body", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 for POST /api/incident-reports without auth", async () => {
    const res = await fetch(`${baseUrl}/api/incident-reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        description: "Test",
        severity: "medium",
        status: "reported",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown API path", async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent`);
    expect(res.status).toBe(404);
  });
});
