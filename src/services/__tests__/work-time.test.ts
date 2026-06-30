import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { createWorkTime, getWorkTime, updateWorkTime } from "../work-time";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("work-time service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getWorkTime returns first record or null", async () => {
    mock.get.mockResolvedValue({ data: [{ id: 1, startTime: "08:00", endTime: "17:00" }] });
    const result = await getWorkTime();
    expect(result).toEqual({ id: 1, startTime: "08:00", endTime: "17:00" });
  });

  it("getWorkTime returns null on empty array", async () => {
    mock.get.mockResolvedValue({ data: [] });
    const result = await getWorkTime();
    expect(result).toBeNull();
  });

  it("createWorkTime sends POST", async () => {
    mock.post.mockResolvedValue({ data: { id: 1 } });
    await createWorkTime({ startTime: "08:00", endTime: "17:00" });
    expect(mock.post).toHaveBeenCalledWith("/work-time/", { startTime: "08:00", endTime: "17:00" });
  });

  it("updateWorkTime sends PUT with id", async () => {
    mock.put.mockResolvedValue({ data: { id: 1 } });
    await updateWorkTime(1, { startTime: "09:00", endTime: "18:00" });
    expect(mock.put).toHaveBeenCalledWith("/work-time/1/", {
      startTime: "09:00",
      endTime: "18:00",
    });
  });
});
