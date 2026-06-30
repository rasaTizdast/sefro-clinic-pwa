import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  cancelVisit,
  completeVisit,
  confirmVisit,
  deleteVisit,
  getVisit,
  listVisits,
  reserveVisit,
  updateVisit,
} from "../visits";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mock = vi.mocked(apiClient.apiClient);

describe("visits service", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listVisits", () => {
    it("sends correct params and maps response", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              customer: 10,
              customerName: "علی رضایی",
              customerMobile: "0912",
              staff: null,
              services: [1, 2],
              serviceNames: ["کوتاهی مو", "رنگ مو"],
              startAt: "2026-06-15 10:00:00",
              endAt: "2026-06-15 11:30:00",
              status: "confirmed",
              notes: "یادداشت تست",
            },
          ],
        },
      });

      const result = await listVisits({ page: 1, perPage: 50 });

      expect(mock.get).toHaveBeenCalledWith("/visits/", {
        params: expect.objectContaining({ page: 1, per_page: 50 }),
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].customerName).toBe("علی رضایی");
      expect(result.data[0].services).toEqual([1, 2]);
      expect(result.data[0].serviceNames).toEqual(["کوتاهی مو", "رنگ مو"]);
      expect(result.data[0].status).toBe("confirmed");
      expect(result.data[0].notes).toBe("یادداشت تست");
    });

    it("computes duration from startAt/endAt", async () => {
      mock.get.mockResolvedValue({
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              customer: 10,
              startAt: "2026-06-15 10:00:00",
              endAt: "2026-06-15 11:30:00",
              status: "pending",
            },
          ],
        },
      });

      const result = await listVisits();
      expect(result.data[0].duration).toBe(90);
    });
  });

  describe("getVisit", () => {
    it("fetches single visit", async () => {
      mock.get.mockResolvedValue({
        data: {
          id: 1,
          customer: 10,
          customerName: "علی",
          startAt: "2026-06-15 10:00:00",
          endAt: "2026-06-15 11:00:00",
          status: "completed",
        },
      });
      const result = await getVisit(1);
      expect(mock.get).toHaveBeenCalledWith("/visits/1/");
      expect(result.id).toBe(1);
      expect(result.status).toBe("completed");
    });
  });

  describe("status transitions", () => {
    it("confirmVisit sends POST to /confirm/", async () => {
      mock.post.mockResolvedValue({ data: {} });
      await confirmVisit(1);
      expect(mock.post).toHaveBeenCalledWith("/visits/1/confirm/");
    });

    it("completeVisit sends POST to /complete/", async () => {
      mock.post.mockResolvedValue({ data: {} });
      await completeVisit(1);
      expect(mock.post).toHaveBeenCalledWith("/visits/1/complete/");
    });

    it("cancelVisit sends POST to /cancel/", async () => {
      mock.post.mockResolvedValue({ data: {} });
      await cancelVisit(1);
      expect(mock.post).toHaveBeenCalledWith("/visits/1/cancel/");
    });
  });

  describe("reserveVisit", () => {
    it("sends POST with correct payload", async () => {
      mock.post.mockResolvedValue({ data: { id: 1 } });
      await reserveVisit({
        customer: 10,
        services: [1, 2],
        date: "2026-06-15",
        time: "10:00",
        notes: "test",
      });
      expect(mock.post).toHaveBeenCalledWith("/visits/reserve/", {
        customer: 10,
        services: [1, 2],
        date: "2026-06-15",
        time: "10:00",
        notes: "test",
      });
    });
  });

  describe("updateVisit", () => {
    it("sends PATCH with correct payload", async () => {
      mock.patch.mockResolvedValue({ data: {} });
      await updateVisit(1, { services: [3], date: "2026-06-20", time: "14:00" });
      expect(mock.patch).toHaveBeenCalledWith("/visits/1/", {
        services: [3],
        date: "2026-06-20",
        time: "14:00",
      });
    });
  });

  describe("deleteVisit", () => {
    it("sends DELETE to correct endpoint", async () => {
      mock.delete.mockResolvedValue({ data: {} });
      await deleteVisit(1);
      expect(mock.delete).toHaveBeenCalledWith("/visits/1/");
    });
  });
});
