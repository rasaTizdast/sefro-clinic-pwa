import { describe, expect, it } from "vitest";

import type { VisitOperator } from "../../types/appointment";
import {
  buildServiceOperatorsPayload,
  filterStaffOptionsForRole,
  initialOperatorSelection,
  type OperatorStaffOption,
} from "../visit-operators";

const operator = (
  service: number,
  staff: number | null,
  compensationRole: VisitOperator["compensationRole"] = "facial",
  staffName: string | null = null
): VisitOperator => ({
  service,
  serviceName: `خدمت ${service}`,
  staff,
  staffName,
  compensationRole,
});

const option = (
  id: number,
  label: string,
  compensationRole?: OperatorStaffOption["compensationRole"]
): OperatorStaffOption => ({ id, label, compensationRole });

describe("initialOperatorSelection", () => {
  it("maps resolved operators to service → staff-string entries", () => {
    const selection = initialOperatorSelection([
      operator(1, 10),
      operator(2, 20, "doctor"),
      operator(3, null, "laser"),
    ]);
    expect(selection).toEqual({ 1: "10", 2: "20", 3: "" });
  });

  it("returns an empty selection for no operators", () => {
    expect(initialOperatorSelection([])).toEqual({});
  });
});

describe("buildServiceOperatorsPayload", () => {
  it("sends only entries the user changed", () => {
    const initial = { 1: "10", 2: "20" };
    const current = { 1: "10", 2: "30" };
    expect(buildServiceOperatorsPayload(initial, current)).toEqual([{ service: 2, staff: 30 }]);
  });

  it("skips cleared selections — the API cannot unassign an operator", () => {
    const initial = { 1: "10", 2: "20" };
    const current = { 1: "", 2: "20" };
    expect(buildServiceOperatorsPayload(initial, current)).toEqual([]);
  });

  it("includes a fresh assignment on a previously unassigned service", () => {
    expect(buildServiceOperatorsPayload({ 1: "" }, { 1: "42" })).toEqual([
      { service: 1, staff: 42 },
    ]);
  });

  it("ignores non-numeric service keys", () => {
    const current = { abc: "42" } as unknown as Record<number, string>;
    expect(buildServiceOperatorsPayload({}, current)).toEqual([]);
  });
});

describe("filterStaffOptionsForRole", () => {
  const doctors = [option(1, "دکتر احمدی", "doctor"), option(2, "دکتر محمدی", "doctor")];
  const facials = [option(3, "مریم", "facial")];
  const all = [...doctors, ...facials, option(4, "رضا")];

  it("offers everyone for a none-role service", () => {
    const result = filterStaffOptionsForRole(all, "none", []);
    expect(result.map((o) => o.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it("keeps only the matching role when roles are known", () => {
    const result = filterStaffOptionsForRole(all, "doctor", []);
    expect(result.map((o) => o.id).sort()).toEqual([1, 2]);
  });

  it("degrades to everyone when no option carries a role", () => {
    const roleless = [option(1, "علی"), option(2, "مریم")];
    expect(
      filterStaffOptionsForRole(roleless, "doctor", [])
        .map((o) => o.id)
        .sort()
    ).toEqual([1, 2]);
  });

  it("adds staff the backend resolved onto a same-role service", () => {
    // Role proven by this visit's own resolution — relevant even when that
    // person is missing from the option list.
    const result = filterStaffOptionsForRole(all, "laser", [operator(5, 9, "laser", "سعید")]);
    expect(result.map((o) => o.id)).toEqual([9]);
    expect(result[0]?.label).toBe("سعید");
  });

  it("always keeps the currently assigned staff visible", () => {
    const result = filterStaffOptionsForRole(all, "doctor", [], 3);
    expect(result.map((o) => o.id).sort()).toEqual([1, 2, 3]);
  });

  it("labels a current assignee missing from the options list", () => {
    const result = filterStaffOptionsForRole(all, "doctor", [], 99);
    const current = result.find((o) => o.id === 99);
    expect(current?.label).toBe("پرسنل 99");
  });
});
