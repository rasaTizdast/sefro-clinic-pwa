import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { createService, deleteService, getService, listServices, updateService } from "../services";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("services service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listServices", () => {
    it("sends correct params and maps response", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [{ id: 1, name: "کوتاهی مو", time: 30, price: "150000", is_active: true }],
        },
      });

      const result = await listServices({ page: 1, perPage: 20 });

      expect(mock.get).toHaveBeenCalledWith("/services/", {
        params: expect.objectContaining({ page: 1, per_page: 20 }),
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe("کوتاهی مو");
      expect(result.data[0].duration).toBe(30);
      expect(result.data[0].price).toBe(150000);
      expect(result.data[0].isActive).toBe(true);
    });
  });

  describe("createService", () => {
    it("maps title→name and duration→time for backend", async () => {
      mock.post.mockResolvedValue({
        data: { id: 1, name: "کوتاهی مو", time: 30, price: "150000", is_active: true },
      });
      await createService({
        title: "کوتاهی مو",
        duration: 30,
        price: 150000,
        description: "",
        isActive: true,
      });
      expect(mock.post).toHaveBeenCalledWith("/services/", {
        name: "کوتاهی مو",
        time: 30,
        price: 150000,
        description: "",
        is_active: true,
      });
    });
  });

  describe("updateService", () => {
    it("maps fields correctly for PUT", async () => {
      mock.put.mockResolvedValue({ data: { id: 1 } });
      await updateService(1, { title: "رنگ مو", duration: 60, price: 300000 });
      expect(mock.put).toHaveBeenCalledWith("/services/1/", {
        name: "رنگ مو",
        time: 60,
        price: 300000,
        description: "",
        is_active: true,
      });
    });
  });

  describe("getService", () => {
    it("maps backend name→title and time→duration", async () => {
      mock.get.mockResolvedValue({
        data: { id: 1, name: "کوتاهی مو", time: 30, price: "150000", is_active: true },
      });
      const result = await getService(1);
      expect(result.title).toBe("کوتاهی مو");
      expect(result.duration).toBe(30);
      expect(result.price).toBe(150000);
      expect(result.isActive).toBe(true);
    });
  });

  it("deleteService sends DELETE", async () => {
    mock.delete.mockResolvedValue({ data: {} });
    await deleteService(1);
    expect(mock.delete).toHaveBeenCalledWith("/services/1/");
  });
});
