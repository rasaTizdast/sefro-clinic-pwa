import { describe, expect, it, vi } from "vitest";

const mockTransform = { toCamelCase: vi.fn(), toSnakeCase: vi.fn() };

vi.mock("../transform", () => mockTransform);

const mockCreate = vi.fn(() => ({
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
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
      baseURL: "http://localhost:8000/api",
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });
  });
});
