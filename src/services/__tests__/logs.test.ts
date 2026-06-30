import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { getLog, listLogs } from "../logs";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("logs service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listLogs sends correct params", async () => {
    mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });
    await listLogs({ page: 1, perPage: 30 });
    expect(mock.get).toHaveBeenCalledWith("/logs/", {
      params: { page: 1, per_page: 30, search: undefined },
    });
  });

  it("getLog fetches single log", async () => {
    mock.get.mockResolvedValue({
      data: {
        id: 1,
        user: 1,
        username: "admin",
        action: "CREATE",
        modelName: "Customer",
        objectId: 1,
        objectRepr: "test",
        changes: null,
        timestamp: "2026-06-15T10:00:00Z",
      },
    });
    const result = await getLog(1);
    expect(result.id).toBe(1);
    expect(result.action).toBe("CREATE");
  });
});
