import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct } from "../products";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("products service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listProducts", () => {
    it("sends correct params and maps response", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              name: "شامپو",
              count: 10,
              unit: "عدد",
              unitPrice: "50000",
              status: "available",
            },
          ],
        },
      });

      const result = await listProducts({ page: 1, perPage: 20 });

      expect(mock.get).toHaveBeenCalledWith("/inventory/products/", {
        params: expect.objectContaining({ page: 1, per_page: 20 }),
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("شامپو");
      expect(result.data[0].stock).toBe(10);
      expect(result.data[0].unitPrice).toBe("50000");
      expect(result.data[0].status).toBe("available");
    });
  });

  describe("createProduct", () => {
    it("maps stock→count and unitPrice→unit_price", async () => {
      mock.post.mockResolvedValue({
        data: { id: 1, name: "شامپو", count: 10, unit_price: "50000" },
      });
      await createProduct({
        name: "شامپو",
        stock: 10,
        unit: "عدد",
        unitPrice: 50000,
        description: "",
      });
      expect(mock.post).toHaveBeenCalledWith("/inventory/products/", {
        name: "شامپو",
        count: 10,
        unit: "عدد",
        unit_price: 50000,
        description: "",
      });
    });
  });

  describe("updateProduct", () => {
    it("maps fields correctly for PUT", async () => {
      mock.put.mockResolvedValue({ data: { id: 1 } });
      await updateProduct(1, { name: "شامپو", stock: 20, unitPrice: 60000 });
      expect(mock.put).toHaveBeenCalledWith("/inventory/products/1/", {
        name: "شامپو",
        count: 20,
        unit: "",
        unit_price: 60000,
        description: "",
      });
    });
  });

  describe("getProduct", () => {
    it("maps backend count→stock", async () => {
      mock.get.mockResolvedValue({
        data: {
          id: 1,
          name: "شامپو",
          count: 10,
          unit: "عدد",
          unitPrice: "50000",
          status: "available",
        },
      });
      const result = await getProduct(1);
      expect(result.stock).toBe(10);
      expect(result.unitPrice).toBe("50000");
      expect(result.status).toBe("available");
    });
  });

  it("deleteProduct sends DELETE", async () => {
    mock.delete.mockResolvedValue({ data: {} });
    await deleteProduct(1);
    expect(mock.delete).toHaveBeenCalledWith("/inventory/products/1/");
  });

  it("maps costUsd and defaults it to null", async () => {
    mock.get.mockResolvedValue({
      data: { id: 1, name: "شامپو", count: 10, costUsd: "1.50" },
    });
    const result = await getProduct(1);
    expect(result.costUsd).toBe("1.50");

    mock.get.mockResolvedValue({ data: { id: 2, name: "صابون", count: 3 } });
    const fallback = await getProduct(2);
    expect(fallback.costUsd).toBeNull();
  });

  it("sends cost_usd only when the caller provides it", async () => {
    mock.post.mockResolvedValue({ data: { id: 1 } });
    await createProduct({ name: "شامپو", stock: 10, unit: "عدد", costUsd: "1.50" });
    expect(mock.post).toHaveBeenCalledWith(
      "/inventory/products/",
      expect.objectContaining({ cost_usd: "1.50" })
    );

    mock.post.mockResolvedValue({ data: { id: 2 } });
    await createProduct({ name: "صابون", stock: 3, unit: "عدد" });
    const payload = mock.post.mock.calls[1][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("cost_usd");
  });

  it("maps unitPriceUsd from the warehouse form to cost_usd", async () => {
    mock.post.mockResolvedValue({ data: { id: 1 } });
    await createProduct({
      name: "شامپو",
      stock: 10,
      unit: "عدد",
      unitPrice: 250000,
      unitPriceUsd: 2.5,
    });
    expect(mock.post).toHaveBeenCalledWith(
      "/inventory/products/",
      expect.objectContaining({ cost_usd: 2.5 })
    );

    mock.put.mockResolvedValue({ data: { id: 1 } });
    await updateProduct(1, { name: "شامپو", stock: 10, unitPriceUsd: null });
    const payload = mock.put.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("cost_usd");
  });
});
