import { describe, expect, it, vi } from "vitest";

const mockToCamelCase = vi.fn((data) => data);
const mockToSnakeCase = vi.fn((data) => data);

vi.mock("../transform", () => ({
  toCamelCase: mockToCamelCase,
  toSnakeCase: mockToSnakeCase,
}));

let requestHandler: ((config: Record<string, unknown>) => Record<string, unknown>) | null = null;
let responseHandler: ((response: Record<string, unknown>) => Record<string, unknown>) | null = null;

const mockCreate = vi.fn(() => ({
  interceptors: {
    request: {
      use: vi.fn((handler: (config: Record<string, unknown>) => Record<string, unknown>) => {
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

vi.mock("axios", () => ({ default: { create: mockCreate } }));

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
