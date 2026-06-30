import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "../customers";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("customers service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listCustomers", () => {
    it("sends correct params and maps DRF response", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              firstName: "علی",
              lastName: "رضایی",
              mobileNumber: "0912",
              visitNumber: 3,
              isNewCustomer: false,
              isLoyalCustomer: true,
              totalPayments: 500000,
            },
            {
              id: 2,
              firstName: "سارا",
              lastName: "احمدی",
              mobileNumber: "0935",
              visitNumber: 0,
              isNewCustomer: true,
              isLoyalCustomer: false,
              totalPayments: 0,
            },
          ],
        },
      });

      const result = await listCustomers({ page: 1, perPage: 20 });

      expect(mock.get).toHaveBeenCalledWith("/customers/", {
        params: { page: 1, per_page: 20, search: undefined, ordering: undefined },
      });
      expect(result.data).toHaveLength(2);
      expect(result.data[0].firstName).toBe("علی");
      expect(result.data[0].status).toBe("loyal");
      expect(result.data[1].status).toBe("new");
      expect(result.total).toBe(2);
    });

    it("sends search param when provided", async () => {
      mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });
      await listCustomers({ search: "علی" });
      expect(mock.get).toHaveBeenCalledWith("/customers/", {
        params: { page: 1, per_page: 20, search: "علی", ordering: undefined },
      });
    });

    it("sends ordering with desc prefix", async () => {
      mock.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });
      await listCustomers({ sort: "firstName", order: "desc" });
      expect(mock.get).toHaveBeenCalledWith("/customers/", {
        params: { page: 1, per_page: 20, search: undefined, ordering: "-firstName" },
      });
    });
  });

  describe("getCustomer", () => {
    it("fetches and maps single customer", async () => {
      mock.get.mockResolvedValue({
        data: {
          id: 1,
          firstName: "علی",
          lastName: "رضایی",
          mobileNumber: "0912",
          nationalId: "1234567890",
          bitmojiCode: "ABC",
          visitNumber: 5,
          isNewCustomer: false,
          isLoyalCustomer: false,
          totalPayments: 100000,
        },
      });
      const result = await getCustomer(1);
      expect(mock.get).toHaveBeenCalledWith("/customers/1/");
      expect(result.id).toBe(1);
      expect(result.firstName).toBe("علی");
      expect(result.status).toBe("active");
    });
  });

  describe("createCustomer", () => {
    it("sends POST with correct payload", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      await createCustomer({
        firstName: "علی",
        lastName: "رضایی",
        mobileNumber: "0912",
        nationalId: "1234567890",
        bitmojiCode: "ABC",
        notes: "",
      });
      expect(mock.post).toHaveBeenCalledWith("/customers/", {
        firstName: "علی",
        lastName: "رضایی",
        mobileNumber: "0912",
        nationalId: "1234567890",
        bitmojiCode: "ABC",
        notes: "",
      });
    });

    it("removes empty bitmojiCode from payload", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      await createCustomer({
        firstName: "علی",
        lastName: "رضایی",
        mobileNumber: "0912",
        nationalId: "1234567890",
        bitmojiCode: "",
        notes: "",
      });
      const payload = mock.post.mock.calls[0][1] as Record<string, unknown>;
      expect(payload).not.toHaveProperty("bitmojiCode");
    });
  });

  describe("updateCustomer", () => {
    it("sends PUT with correct endpoint", async () => {
      mock.put.mockResolvedValue({ data: { id: 1 } });
      await updateCustomer(1, { firstName: "علی جدید" });
      expect(mock.put).toHaveBeenCalledWith("/customers/1/", { firstName: "علی جدید" });
    });
  });

  describe("deleteCustomer", () => {
    it("sends DELETE to correct endpoint", async () => {
      mock.delete.mockResolvedValue({ data: {} });
      await deleteCustomer(1);
      expect(mock.delete).toHaveBeenCalledWith("/customers/1/");
    });
  });

  describe("status mapping", () => {
    it("maps isNewCustomer to 'new'", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              firstName: "تست",
              isNewCustomer: true,
              isLoyalCustomer: false,
              visitNumber: 0,
            },
          ],
        },
      });
      const result = await listCustomers();
      expect(result.data[0].status).toBe("new");
    });

    it("maps isLoyalCustomer to 'loyal'", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              firstName: "تست",
              isNewCustomer: false,
              isLoyalCustomer: true,
              visitNumber: 10,
            },
          ],
        },
      });
      const result = await listCustomers();
      expect(result.data[0].status).toBe("loyal");
    });

    it("maps zero visits to 'inactive'", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              firstName: "تست",
              isNewCustomer: false,
              isLoyalCustomer: false,
              visitNumber: 0,
            },
          ],
        },
      });
      const result = await listCustomers();
      expect(result.data[0].status).toBe("inactive");
    });

    it("maps non-zero visits to 'active'", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              firstName: "تست",
              isNewCustomer: false,
              isLoyalCustomer: false,
              visitNumber: 3,
            },
          ],
        },
      });
      const result = await listCustomers();
      expect(result.data[0].status).toBe("active");
    });
  });
});
