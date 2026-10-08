import { beforeEach, describe, expect, it, vi } from "vitest";

import * as apiClient from "../../lib/api-client";
import {
  deleteWelcomePack,
  getWelcomePackReport,
  listWelcomePacks,
  saveWelcomePack,
} from "../welcomePacks";

vi.mock("../../lib/api-client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mock = vi.mocked(apiClient.apiClient);

const rawPack = {
  id: 3,
  name: "پک VIP",
  description: "",
  isActive: true,
  createdAt: "",
  updatedAt: "",
  createdBy: null,
  createdByName: null,
  totalCostUsd: "5.00",
  totalCostToman: "500000",
  exchangeRate: "100000",
  items: [
    {
      id: 11,
      welcomePack: 3,
      product: 7,
      productName: "ماسک",
      quantity: "2.000",
      createdAt: "",
      updatedAt: "",
    },
  ],
};

describe("welcomePacks service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists packs and maps items", async () => {
    mock.get.mockResolvedValue({
      data: { count: 1, next: null, previous: null, results: [rawPack] },
    });

    const res = await listWelcomePacks({ isActive: true });

    expect(mock.get).toHaveBeenCalledWith(
      "/finance/welcome-packs/",
      expect.objectContaining({ params: expect.objectContaining({ is_active: true }) })
    );
    expect(res.data[0].items[0].productName).toBe("ماسک");
  });

  it("creates a pack WITH nested items in a single backend request", async () => {
    mock.post.mockResolvedValue({ data: rawPack });

    const pack = await saveWelcomePack({
      name: "پک VIP",
      isActive: true,
      items: [{ product: 7, quantity: "2" }],
    });

    // One POST to the welcome-pack API carrying the nested items — no
    // per-item requests, no service-items involvement.
    expect(mock.post).toHaveBeenCalledTimes(1);
    expect(mock.post).toHaveBeenCalledWith(
      "/finance/welcome-packs/",
      expect.objectContaining({
        name: "پک VIP",
        items: [{ product: 7, quantity: "2" }],
      })
    );
    expect(mock.post).not.toHaveBeenCalledWith(
      expect.stringContaining("service-items"),
      expect.anything()
    );
    expect(pack.id).toBe(3);
    expect(pack.items).toHaveLength(1);
  });

  it("updates a pack WITH nested items in a single backend request", async () => {
    mock.put.mockResolvedValue({ data: rawPack });

    const pack = await saveWelcomePack({
      id: 3,
      name: "پک VIP",
      items: [
        { product: 7, quantity: "2" },
        { product: 8, quantity: "1" },
      ],
    });

    expect(mock.put).toHaveBeenCalledTimes(1);
    expect(mock.put).toHaveBeenCalledWith(
      "/finance/welcome-packs/3/",
      expect.objectContaining({
        items: [
          { product: 7, quantity: "2" },
          { product: 8, quantity: "1" },
        ],
      })
    );
    expect(pack.id).toBe(3);
  });

  it("deletes a pack definition", async () => {
    mock.delete.mockResolvedValue({ data: {} });

    await deleteWelcomePack(3);

    expect(mock.delete).toHaveBeenCalledWith("/finance/welcome-packs/3/");
  });

  it("reads issued-pack counts and cost for a period", async () => {
    mock.get.mockResolvedValue({
      data: {
        period: { start: "2026-09-01T00:00:00+00:00", end: "2026-09-30T23:59:59+00:00" },
        totalUsageCount: 3,
        totalPacksIssued: "3.000",
        totalCostUsd: "4.13",
        totalCostToman: "413000",
        byPack: [
          {
            welcomePackId: 1,
            // The backend's `welcome_pack__name` half-survives camelCasing.
            welcomePack_Name: "خوش‌آمد سه‌شنبه",
            count: 1,
            usageCount: 1,
            costUsd: "4.13",
            costToman: "413000",
          },
        ],
      },
    });

    const report = await getWelcomePackReport({ period: "this_month" });

    expect(mock.get).toHaveBeenCalledWith("/finance/reports/welcome-packs/", {
      params: { period: "this_month" },
    });
    expect(report.totalPacksIssued).toBe("3.000");
    expect(report.totalCostUsd).toBe("4.13");
    expect(report.byPack[0].name).toBe("خوش‌آمد سه‌شنبه");
  });

  it("prefers an explicit date range over the named period", async () => {
    mock.get.mockResolvedValue({ data: {} });

    const report = await getWelcomePackReport({
      period: "this_month",
      startDate: "2026-09-01",
      endDate: "2026-09-15",
    });

    expect(mock.get).toHaveBeenCalledWith("/finance/reports/welcome-packs/", {
      params: { start_date: "2026-09-01", end_date: "2026-09-15" },
    });
    expect(report.totalPacksIssued).toBe("0");
    expect(report.byPack).toEqual([]);
  });
});
