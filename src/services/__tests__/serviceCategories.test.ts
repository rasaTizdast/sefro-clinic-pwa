import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  createCategory,
  deleteCategory,
  listCategories,
  toCategory,
  updateCategory,
} from "../serviceCategories";

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
const rawCategory = {
  id: 3,
  name: "لیزر",
  slug: "laser",
  description: "خدمات لیزر مو",
  isActive: true,
  sortOrder: 2,
};

describe("toCategory", () => {
  it("maps the wire shape", () => {
    expect(toCategory(rawCategory as never)).toEqual(rawCategory);
  });

  it("defaults missing fields", () => {
    expect(toCategory({ id: 9 } as never)).toEqual({
      id: 9,
      name: "",
      slug: "",
      description: "",
      isActive: true,
      sortOrder: 0,
    });
  });
});

describe("serviceCategories service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listCategories", () => {
    it("follows every DRF page until `next` is exhausted", async () => {
      mock.get
        .mockResolvedValueOnce({
          data: {
            count: 3,
            next: "https://api.test/api/service-categories/?page=2",
            previous: null,
            results: [rawCategory, { ...rawCategory, id: 4, name: "فیشال", slug: "facial" }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            count: 3,
            next: null,
            previous: "https://api.test/api/service-categories/?page=1",
            results: [{ ...rawCategory, id: 5, name: "بدن", slug: "body" }],
          },
        });

      const categories = await listCategories();

      expect(mock.get).toHaveBeenNthCalledWith(1, "/service-categories/", {
        params: { page: 1, per_page: 100 },
      });
      expect(mock.get).toHaveBeenNthCalledWith(2, "/service-categories/", {
        params: { page: 2, per_page: 100 },
      });
      expect(categories.map((c) => c.slug)).toEqual(["laser", "facial", "body"]);
      expect(categories[0].sortOrder).toBe(2);
    });

    it("accepts an unpaginated array payload", async () => {
      mock.get.mockResolvedValue({ data: [rawCategory] });

      const categories = await listCategories();

      expect(mock.get).toHaveBeenCalledTimes(1);
      expect(categories).toHaveLength(1);
      expect(categories[0].id).toBe(3);
    });
  });

  describe("createCategory / updateCategory", () => {
    it("POSTs to the collection endpoint and maps the created row", async () => {
      mock.post.mockResolvedValue({ data: rawCategory });
      const payload = { name: "لیزر", slug: "laser", sortOrder: 2 };

      const created = await createCategory(payload);

      expect(mock.post).toHaveBeenCalledWith("/service-categories/", payload);
      expect(created).toEqual(rawCategory);
    });

    it("PUTs to the detail endpoint", async () => {
      mock.put.mockResolvedValue({ data: { ...rawCategory, isActive: false } });

      const updated = await updateCategory(3, { name: "لیزر", isActive: false });

      expect(mock.put).toHaveBeenCalledWith("/service-categories/3/", {
        name: "لیزر",
        isActive: false,
      });
      expect(updated.isActive).toBe(false);
    });
  });

  describe("deleteCategory", () => {
    it("DELETEs the category", async () => {
      mock.delete.mockResolvedValue({ data: null });

      await deleteCategory(3);

      expect(mock.delete).toHaveBeenCalledWith("/service-categories/3/");
    });

    it("surfaces the backend 400 message when the category still has services", async () => {
      mock.delete.mockRejectedValue({
        message: "خطای سرور",
        raw: { detail: "این دسته‌بندی دارای خدمت است و حذف نمی‌شود." },
      });

      await expect(deleteCategory(3)).rejects.toThrow(
        "این دسته‌بندی دارای خدمت است و حذف نمی‌شود."
      );
    });
  });
});
