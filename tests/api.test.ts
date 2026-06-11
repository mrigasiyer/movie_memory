import { describe, it, expect, vi, afterEach } from "vitest";
import { api, ApiError } from "@/lib/api";

// Replace global fetch with a single canned Response-like object. The api
// wrapper only touches res.ok / res.status / res.text(), so that's all we fake.
function mockFetch(opts: { ok: boolean; status: number; body?: unknown }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: opts.ok,
    status: opts.status,
    text: async () => (opts.body === undefined ? "" : JSON.stringify(opts.body)),
  }) as unknown as typeof fetch;
}

describe("api client error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws a normalized ApiError(401) using the server's message", async () => {
    mockFetch({ ok: false, status: 401, body: { error: "Unauthorized" } });
    const err = await api.getMe().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.message).toBe("Unauthorized");
  });

  it("throws ApiError(500) and surfaces the server message", async () => {
    mockFetch({ ok: false, status: 500, body: { error: "Something broke" } });
    const err = await api.getFact().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe("Something broke");
  });

  it("falls back to a generic message when the error body is unexpected", async () => {
    // e.g. a 500 that returns HTML instead of our { error } envelope
    mockFetch({ ok: false, status: 500, body: { oops: true } });
    const err = await api.getMe().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe("Request failed (500).");
  });

  it("treats a network failure as ApiError(0)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    const err = await api.getMe().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.message).toMatch(/network error/i);
  });

  it("throws when a 200 response doesn't match the schema", async () => {
    // ok:true but the body is missing required fields
    mockFetch({ ok: true, status: 200, body: { id: "u1" } });
    const err = await api.getMe().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toMatch(/unexpected response/i);
  });

  it("returns typed data on a valid response", async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: {
        id: "u1",
        name: "Ada",
        email: "ada@example.com",
        image: null,
        favoriteMovie: "Inception",
      },
    });
    const me = await api.getMe();
    expect(me.favoriteMovie).toBe("Inception");
    expect(me.image).toBeNull();
  });
});
