import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { listServiceItems, syncServiceItems, toServiceItem } from "../serviceItems";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

/** Wire shape — camelCased by the api-client response interceptor. */
const rawItem = { id: 11, service: 4, product: 2, productName: "ژل لیزر", quantity: "1.50" };

const existingItems = [
  rawItem,
  { id: 12, service: 4, product: 9, productName: "کرم بی‌حسی", quantity: "1.00" },
  { id: 13, service: 4, product: 7, productName: "سرم ترمیم", quantity: "2.00" },
];

describe("toServiceItem", () => {
  it("maps the wire shape and keeps the quantity a string", () => {
    const item = toServiceItem(rawItem as never);

    expect(item).toEqual(rawItem);
    expect(typeof item.quantity).toBe("string");
  });

  it("defaults missing fields", () => {
    expect(toServiceItem({ id: 1, service: 4, product: 2 } as never)).toEqual({
      id: 1,
      service: 4,
      product: 2,
      productName: "",
      quantity: "0.00",
    });
  });
});

describe("serviceItems service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listServiceItems", () => {
    it("filters by service and follows pagination", async () => {
      mock.get
        .mockResolvedValueOnce({
          data: {
            count: 2,
            next: "https://api.test/api/finance/service-items/?page=2",
            previous: null,
            results: [rawItem],
          },
        })
        .mockResolvedValueOnce({
          data: {
            count: 2,
            next: null,
            previous: null,
            results: [{ ...rawItem, id: 14, product: 5 }],
          },
        });

      const items = await listServiceItems(4);

      expect(mock.get).toHaveBeenNthCalledWith(1, "/finance/service-items/", {
        params: { service: 4, page: 1, per_page: 100 },
      });
      expect(mock.get).toHaveBeenNthCalledWith(2, "/finance/service-items/", {
        params: { service: 4, page: 2, per_page: 100 },
      });
      expect(items.map((i) => i.product)).toEqual([2, 5]);
    });
  });

  describe("syncServiceItems", () => {
    it("POSTs new products, PATCHes changed quantities and DELETEs removed rows", async () => {
      mock.get.mockResolvedValue({
        data: { count: 3, next: null, previous: null, results: existingItems },
      });
      mock.post.mockResolvedValue({ data: {} });
      mock.patch.mockResolvedValue({ data: {} });
      mock.delete.mockResolvedValue({ data: null });

      const items = await syncServiceItems(4, [
        { product: 2, quantity: "1.50" },
        { product: 9, quantity: "3.00" },
        { product: 5, quantity: "1.00" },
      ]);

      expect(mock.post).toHaveBeenCalledTimes(1);
      expect(mock.post).toHaveBeenCalledWith("/finance/service-items/", {
        service: 4,
        product: 5,
        quantity: "1.00",
      });
      expect(mock.patch).toHaveBeenCalledTimes(1);
      expect(mock.patch).toHaveBeenCalledWith("/finance/service-items/12/", { quantity: "3.00" });
      expect(mock.delete).toHaveBeenCalledTimes(1);
      expect(mock.delete).toHaveBeenCalledWith("/finance/service-items/13/");
      // returns the refreshed list so callers can render the server state
      expect(items.map((i) => i.product)).toEqual([2, 9, 7]);
    });

    it("makes no write call when the rows already match", async () => {
      mock.get.mockResolvedValue({
        data: { count: 3, next: null, previous: null, results: existingItems },
      });

      await syncServiceItems(
        4,
        existingItems.map((i) => ({ product: i.product, quantity: i.quantity }))
      );

      expect(mock.post).not.toHaveBeenCalled();
      expect(mock.patch).not.toHaveBeenCalled();
      expect(mock.delete).not.toHaveBeenCalled();
    });

    it("POSTs every row when the service has no consumables yet", async () => {
      mock.get
        .mockResolvedValueOnce({ data: { count: 0, next: null, previous: null, results: [] } })
        .mockResolvedValueOnce({ data: { count: 2, next: null, previous: null, results: [] } });
      mock.post.mockResolvedValue({ data: {} });

      await syncServiceItems(4, [
        { product: 5, quantity: "1.00" },
        { product: 6, quantity: "2.00" },
      ]);

      expect(mock.post).toHaveBeenNthCalledWith(1, "/finance/service-items/", {
        service: 4,
        product: 5,
        quantity: "1.00",
      });
      expect(mock.post).toHaveBeenNthCalledWith(2, "/finance/service-items/", {
        service: 4,
        product: 6,
        quantity: "2.00",
      });
      expect(mock.delete).not.toHaveBeenCalled();
    });
  });
});
