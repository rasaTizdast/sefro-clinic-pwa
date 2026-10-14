import { describe, expect, it, vi } from "vitest";

const mockToCamelCase = vi.fn((data) => data);
const mockToSnakeCase = vi.fn((data) => data);

vi.mock("../transform", () => ({
  toCamelCase: mockToCamelCase,
  toSnakeCase: mockToSnakeCase,
}));

let requestHandler: ((config: Record<string, unknown>) => Record<string, unknown>) | null = null;
let responseHandler: ((response: Record<string, unknown>) => Record<string, unknown>) | null = null;

type RequestInterceptorHandler = (
  config: Record<string, unknown>
) => Record<string, unknown> | Promise<Record<string, unknown>>;

/** All registered request interceptors, in registration order. */
const requestHandlers: RequestInterceptorHandler[] = [];

const mockAxiosPost = vi.fn();

const mockCreate = vi.fn(() => ({
  interceptors: {
    request: {
      use: vi.fn((handler: (config: Record<string, unknown>) => Record<string, unknown>) => {
        requestHandlers.push(handler);
        requestHandler = handler;
      }),
    },
    response: {
      use: vi.fn((handler: (response: Record<string, unknown>) => Record<string, unknown>) => {
        responseHandler = handler;
      }),
    },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("axios", () => ({ default: { create: mockCreate, post: mockAxiosPost } }));

describe("api-client", () => {
  it("creates axios instance with correct config", async () => {
    mockCreate.mockClear();
    await import("../api-client");
    expect(mockCreate).toHaveBeenCalledWith({
      baseURL: "/api",
      withCredentials: true,
      timeout: 10_000,
      headers: { "Content-Type": "application/json" },
    });
  });

  it("request interceptor converts to snake_case", async () => {
    await import("../api-client");
    expect(requestHandler).not.toBeNull();

    const config = { data: { firstName: "علی", lastName: "رضایی" } };
    mockToSnakeCase.mockReturnValue({ first_name: "علی", last_name: "رضایی" });

    const result = requestHandler!(config);
    expect(mockToSnakeCase).toHaveBeenCalledWith({ firstName: "علی", lastName: "رضایی" });
    expect(result.data).toEqual({ first_name: "علی", last_name: "رضایی" });
  });

  it("response interceptor converts to camelCase", async () => {
    await import("../api-client");
    expect(responseHandler).not.toBeNull();

    const response = { data: { first_name: "علی", last_name: "رضایی" } };
    mockToCamelCase.mockReturnValue({ firstName: "علی", lastName: "رضایی" });

    const result = responseHandler!(response);
    expect(mockToCamelCase).toHaveBeenCalledWith({ first_name: "علی", last_name: "رضایی" });
    expect(result.data).toEqual({ firstName: "علی", lastName: "رضایی" });
  });
});

describe("api-client proactive token refresh", () => {
  beforeEach(() => {
    // Fresh module instance per test so `lastRotatedAt` starts as null.
    vi.resetModules();
    requestHandlers.length = 0;
    mockAxiosPost.mockReset();
    mockAxiosPost.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Imports a fresh api-client and returns the first-registered (proactive) request interceptor. */
  async function loadProactiveHandler(): Promise<RequestInterceptorHandler> {
    await import("../api-client");
    const handler = requestHandlers[0];
    expect(handler).toBeDefined();
    return handler;
  }

  it("refreshes before an unsafe request when last rotation is stale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-12T10:00:00Z"));
    const handler = await loadProactiveHandler();

    // Never rotated (fresh page load) → refresh.
    const config = { method: "post", url: "/customers/", data: {} };
    await handler(config);
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost).toHaveBeenCalledWith(
      "/api/auth/token/refresh/",
      {},
      expect.objectContaining({ withCredentials: true })
    );

    // Fresh (within 13 min) → no second refresh.
    vi.setSystemTime(new Date("2026-10-12T10:10:00Z"));
    await handler({ method: "post", url: "/customers/" });
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);

    // Stale (past 13 min) → refresh again.
    vi.setSystemTime(new Date("2026-10-12T10:14:00Z"));
    await handler({ method: "post", url: "/customers/" });
    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
  });

  it("does not block the request when proactive refresh fails", async () => {
    mockAxiosPost.mockRejectedValue(new Error("refresh failed"));
    const handler = await loadProactiveHandler();

    const config = { method: "delete", url: "/customers/1/" };
    await expect(handler(config)).resolves.toBe(config);
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
  });

  it("skips proactive refresh for safe (GET) requests", async () => {
    const handler = await loadProactiveHandler();
    await handler({ method: "get", url: "/customers/" });
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("skips proactive refresh for the refresh endpoint itself", async () => {
    const handler = await loadProactiveHandler();
    await handler({ method: "post", url: "/auth/token/refresh/" });
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("coalesces concurrent unsafe requests into one refresh POST (single-flight)", async () => {
    const handler = await loadProactiveHandler();
    const results = await Promise.all([
      handler({ method: "post", url: "/customers/" }),
      handler({ method: "post", url: "/visits/reserve/" }),
    ]);
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(2);
  });

  it("markSessionFresh suppresses proactive refresh after login", async () => {
    const { markSessionFresh } = await import("../api-client");
    const handler = requestHandlers[0];
    expect(handler).toBeDefined();

    markSessionFresh();
    await handler({ method: "post", url: "/customers/" });
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });
});
