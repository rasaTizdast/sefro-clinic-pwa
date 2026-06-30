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
});
