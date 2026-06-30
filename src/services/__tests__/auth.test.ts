import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  createEmployee,
  deleteEmployee,
  getMe,
  listEmployees,
  login,
  logout,
  updateEmployee,
} from "../auth";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("auth service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("login sends POST with credentials", async () => {
    mock.post.mockResolvedValue({ data: {} });
    await login("admin", "pass123");
    expect(mock.post).toHaveBeenCalledWith("/auth/token/", {
      username: "admin",
      password: "pass123",
    });
  });

  it("logout sends POST", async () => {
    mock.post.mockResolvedValue({ data: {} });
    await logout();
    expect(mock.post).toHaveBeenCalledWith("/auth/logout/");
  });

  it("getMe returns AuthUser", async () => {
    mock.get.mockResolvedValue({ data: { id: 1, username: "admin", role: "admin" } });
    const result = await getMe();
    expect(result.id).toBe(1);
    expect(result.username).toBe("admin");
  });

  it("listEmployees handles array response", async () => {
    mock.get.mockResolvedValue({
      data: [
        { id: 1, username: "admin" },
        { id: 2, username: "user1" },
      ],
    });
    const result = await listEmployees();
    expect(result).toHaveLength(2);
  });

  it("listEmployees handles DRF paginated response", async () => {
    mock.get.mockResolvedValue({ data: { results: [{ id: 1, username: "admin" }] } });
    const result = await listEmployees();
    expect(result).toHaveLength(1);
  });

  it("listEmployees returns empty array on unexpected shape", async () => {
    mock.get.mockResolvedValue({ data: "unexpected" });
    const result = await listEmployees();
    expect(result).toEqual([]);
  });

  it("createEmployee sends POST", async () => {
    mock.post.mockResolvedValue({ data: {} });
    await createEmployee({ username: "new", password: "pass" });
    expect(mock.post).toHaveBeenCalledWith("/auth/employees/", {
      username: "new",
      password: "pass",
    });
  });

  it("updateEmployee sends PUT", async () => {
    mock.put.mockResolvedValue({ data: {} });
    await updateEmployee(1, { username: "updated" });
    expect(mock.put).toHaveBeenCalledWith("/auth/employees/1/", { username: "updated" });
  });

  it("deleteEmployee sends DELETE", async () => {
    mock.delete.mockResolvedValue({ data: {} });
    await deleteEmployee(1);
    expect(mock.delete).toHaveBeenCalledWith("/auth/employees/1/");
  });
});
