import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import { getPackage, listPackages, savePackage, toPackage } from "../packages";

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

/** Wire shape — camelCased by the api-client response interceptor. Money stays a string. */
const rawPackage = {
  id: 5,
  name: "پکیج لیزر",
  description: "۶ جلسه لیزر",
  priceUsd: "300.00",
  isActive: true,
  createdAt: "2026-09-20T08:00:00Z",
  priceToman: "30000000",
  exchangeRate: "100000.00",
  services: [4, 7],
  items: [{ product: 2, quantity: "1.00" }],
};

/** `package-services` / `package-items` rows used by the nested sync. */
const packageServicesPage = {
  full: [
    { id: 11, package: 5, service: 4 },
    { id: 12, package: 5, service: 7 },
  ],
  missing: [{ id: 11, package: 5, service: 4 }],
};

const packageItemsPage = {
  full: [
    { id: 21, package: 5, product: 2, quantity: "1.00" },
    { id: 22, package: 5, product: 4, quantity: "1.00" },
  ],
  matching: [{ id: 21, package: 5, product: 2, quantity: "1.00" }],
};

const page = (results: unknown[]) => ({
  data: { count: results.length, next: null, previous: null, results },
});

describe("toPackage", () => {
  it("maps services to ids and keeps nested item quantities as strings", () => {
    const pkg = toPackage(rawPackage as never);

    expect(pkg.id).toBe(5);
    expect(pkg.name).toBe("پکیج لیزر");
    expect(pkg.description).toBe("۶ جلسه لیزر");
    expect(pkg.priceUsd).toBe("300.00");
    expect(pkg.priceToman).toBe("30000000");
    expect(pkg.exchangeRate).toBe("100000.00");
    expect(pkg.isActive).toBe(true);
    expect(pkg.services).toEqual([4, 7]);
    expect(pkg.items).toEqual([{ product: 2, quantity: "1.00" }]);
    expect(typeof pkg.items[0].quantity).toBe("string");
  });

  it("defaults missing money, collections and flags", () => {
    expect(toPackage({ id: 1 } as never)).toEqual({
      id: 1,
      name: "",
      description: "",
      priceUsd: "0.00",
      priceToman: null,
      exchangeRate: null,
      isActive: true,
      services: [],
      items: [],
    });
  });

  it("normalises numeric quantities and string service ids", () => {
    const pkg = toPackage({
      id: 1,
      services: ["4", 7],
      items: [{ product: 2, quantity: 3 }],
    } as never);

    expect(pkg.services).toEqual([4, 7]);
    expect(pkg.items).toEqual([{ product: 2, quantity: "3" }]);
  });
  describe("packages service", () => {
    beforeEach(() => vi.clearAllMocks());

    describe("listPackages", () => {
      it("lists the paginated packages and maps them", async () => {
        mock.get.mockResolvedValue(page([rawPackage]));

        const result = await listPackages();

        expect(mock.get).toHaveBeenCalledWith("/finance/packages/", {
          params: { page: 1, per_page: 20 },
        });
        expect(result.total).toBe(1);
        expect(result.data[0].services).toEqual([4, 7]);
      });

      it("passes the pagination/search params through", async () => {
        mock.get.mockResolvedValue(page([]));

        await listPackages({ page: 2, search: "لیزر" });

        expect(mock.get).toHaveBeenCalledWith("/finance/packages/", {
          params: { page: 2, per_page: 20, search: "لیزر" },
        });
      });
    });

    describe("getPackage", () => {
      it("fetches the detail endpoint", async () => {
        mock.get.mockResolvedValue({ data: rawPackage });

        const pkg = await getPackage(5);

        expect(mock.get).toHaveBeenCalledWith("/finance/packages/5/");
        expect(pkg.items[0].quantity).toBe("1.00");
      });
    });

    describe("savePackage", () => {
      it("creates the package then syncs services and items (POST missing, PATCH changed)", async () => {
        mock.post.mockResolvedValue({ data: rawPackage });
        mock.patch.mockResolvedValue({ data: {} });
        mock.delete.mockResolvedValue({ data: null });
        mock.get.mockImplementation((url: string) =>
          Promise.resolve(
            url === "/finance/package-services/"
              ? page(packageServicesPage.missing)
              : page(packageItemsPage.matching)
          )
        );

        const pkg = await savePackage({
          name: "پکیج لیزر",
          description: "۶ جلسه",
          priceUsd: "300.00",
          isActive: true,
          serviceIds: [4, 7],
          items: [
            { product: 2, quantity: "2.00" },
            { product: 9, quantity: "1.00" },
          ],
        });

        expect(mock.post).toHaveBeenCalledWith("/finance/packages/", {
          name: "پکیج لیزر",
          description: "۶ جلسه",
          priceUsd: "300.00",
          isActive: true,
        });
        expect(mock.get).toHaveBeenCalledWith("/finance/package-services/", {
          params: { package: 5, page: 1, per_page: 100 },
        });
        expect(mock.post).toHaveBeenCalledWith("/finance/package-services/", {
          package: 5,
          service: 7,
        });
        expect(mock.get).toHaveBeenCalledWith("/finance/package-items/", {
          params: { package: 5, page: 1, per_page: 100 },
        });
        expect(mock.patch).toHaveBeenCalledWith("/finance/package-items/21/", { quantity: "2.00" });
        expect(mock.post).toHaveBeenCalledWith("/finance/package-items/", {
          package: 5,
          product: 9,
          quantity: "1.00",
        });
        expect(mock.delete).not.toHaveBeenCalled();
        expect(pkg.id).toBe(5);
      });

      it("updates an existing package, DELETEing removed services and items", async () => {
        mock.put.mockResolvedValue({ data: rawPackage });
        mock.delete.mockResolvedValue({ data: null });
        mock.get.mockImplementation((url: string) =>
          Promise.resolve(
            url === "/finance/package-services/"
              ? page(packageServicesPage.full)
              : page(packageItemsPage.full)
          )
        );

        await savePackage({
          id: 5,
          name: "پکیج لیزر",
          priceUsd: "300.00",
          serviceIds: [4],
          items: [],
        });

        expect(mock.put).toHaveBeenCalledWith("/finance/packages/5/", {
          name: "پکیج لیزر",
          description: "",
          priceUsd: "300.00",
          isActive: true,
        });
        expect(mock.post).not.toHaveBeenCalled();
        expect(mock.delete).toHaveBeenCalledWith("/finance/package-services/12/");
        expect(mock.delete).toHaveBeenCalledWith("/finance/package-items/21/");
        expect(mock.delete).toHaveBeenCalledWith("/finance/package-items/22/");
      });

      it("skips the nested sync when services/items are not provided", async () => {
        mock.put.mockResolvedValue({ data: rawPackage });

        await savePackage({ id: 5, name: "پکیج لیزر", priceUsd: "300.00" });

        expect(mock.get).not.toHaveBeenCalled();
        expect(mock.delete).not.toHaveBeenCalled();
      });

      it("throws the backend message when the package save fails", async () => {
        mock.post.mockRejectedValue({
          message: "خطای سرور",
          raw: { name: ["پکیجی با این نام از قبل وجود دارد"] },
        });

        await expect(savePackage({ name: "پکیج لیزر", priceUsd: "300.00" })).rejects.toThrow(
          "پکیجی با این نام از قبل وجود دارد"
        );
      });

      it("throws the backend message when the nested sync fails", async () => {
        mock.get.mockResolvedValue(page([]));
        mock.post.mockResolvedValueOnce({ data: rawPackage }).mockRejectedValueOnce({
          message: "خطای سرور",
          raw: { service: ["خدمت انتخابی نامعتبر است"] },
        });

        await expect(
          savePackage({ name: "پکیج لیزر", priceUsd: "300.00", serviceIds: [99] })
        ).rejects.toThrow("خدمت انتخابی نامعتبر است");
      });
    });
  });
});
