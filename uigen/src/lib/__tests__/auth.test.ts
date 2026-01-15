import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");
const COOKIE_NAME = "auth-token";

import { createSession, getSession, deleteSession, verifySession } from "../auth";

async function createTestToken(payload: { userId: string; email: string; expiresAt: Date }) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

async function createExpiredToken(payload: { userId: string; email: string; expiresAt: Date }) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1h")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates a session and sets cookie", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
    const [cookieName, token, options] = mockCookieStore.set.mock.calls[0];

    expect(cookieName).toBe(COOKIE_NAME);
    expect(typeof token).toBe("string");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toBeInstanceOf(Date);
  });

  test("creates a valid JWT token", async () => {
    await createSession("user-456", "user@test.com");

    const token = mockCookieStore.set.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-456");
    expect(payload.email).toBe("user@test.com");
    expect(payload.expiresAt).toBeDefined();
  });

  test("sets cookie expiration to 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-789", "another@test.com");
    const after = Date.now();

    const options = mockCookieStore.set.mock.calls[0][2];
    const expiresTime = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresTime).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(expiresTime).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no cookie exists", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns session payload for valid token", async () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const token = await createTestToken(payload);
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null for expired token", async () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date(Date.now() - 1000),
    };
    const token = await createExpiredToken(payload);
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for invalid token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "invalid-token" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null for tampered token", async () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const token = await createTestToken(payload);
    const tamperedToken = token.slice(0, -5) + "xxxxx";
    mockCookieStore.get.mockReturnValue({ value: tamperedToken });

    const session = await getSession();

    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("deletes the auth cookie", async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledTimes(1);
    expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
  });
});

describe("verifySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no cookie in request", async () => {
    const mockRequest = {
      cookies: {
        get: vi.fn().mockReturnValue(undefined),
      },
    } as any;

    const session = await verifySession(mockRequest);

    expect(session).toBeNull();
    expect(mockRequest.cookies.get).toHaveBeenCalledWith(COOKIE_NAME);
  });

  test("returns session payload for valid token in request", async () => {
    const payload = {
      userId: "user-456",
      email: "request@test.com",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    const token = await createTestToken(payload);
    const mockRequest = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: token }),
      },
    } as any;

    const session = await verifySession(mockRequest);

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-456");
    expect(session?.email).toBe("request@test.com");
  });

  test("returns null for invalid token in request", async () => {
    const mockRequest = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: "bad-token" }),
      },
    } as any;

    const session = await verifySession(mockRequest);

    expect(session).toBeNull();
  });

  test("returns null for expired token in request", async () => {
    const payload = {
      userId: "user-789",
      email: "expired@test.com",
      expiresAt: new Date(Date.now() - 1000),
    };
    const token = await createExpiredToken(payload);
    const mockRequest = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: token }),
      },
    } as any;

    const session = await verifySession(mockRequest);

    expect(session).toBeNull();
  });
});
