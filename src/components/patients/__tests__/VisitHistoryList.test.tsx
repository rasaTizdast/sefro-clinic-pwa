import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Appointment } from "../../../types/appointment";
import { VisitHistoryList } from "../VisitHistoryList";

const state = vi.hoisted(() => ({
  visits: [
    {
      id: 1,
      customer: 42,
      customerName: "بیمار تست",
      customerMobile: "09121234567",
      staff: null,
      services: [1],
      serviceNames: ["فیشال صورت"],
      startAt: "2026-10-12 14:30:00",
      endAt: "2026-10-12 15:00:00",
      date: "2026-10-12",
      time: "14:30",
      duration: 30,
      status: "completed",
      notes: "",
    } satisfies Appointment,
  ] satisfies Appointment[],
}));

vi.mock("../../../hooks/api", () => ({
  useAllVisits: () => ({ data: state.visits, isLoading: false }),
}));

describe("VisitHistoryList", () => {
  it("renders the visit time in Persian digits, never Latin", () => {
    render(<VisitHistoryList customerId={42} />);

    expect(screen.getByText("۱۴:۳۰")).toBeInTheDocument();
    expect(screen.queryByText("14:30")).not.toBeInTheDocument();
  });

  it("spaces date and time with a flex gap and darkens the time color", () => {
    render(<VisitHistoryList customerId={42} />);

    const time = screen.getByText("۱۴:۳۰");
    // the date container is a flex row with a direction-agnostic gap —
    // the old dir="ltr" + ms-2 combo collapsed the spacing in RTL
    expect(time.parentElement).toHaveClass("flex", "gap-2");
    expect(time).toHaveClass("text-surface-700");
    expect(time).not.toHaveClass("text-surface-500");
  });

  it("renders the same Persian time in compact (wizard) usage", () => {
    render(<VisitHistoryList customerId={42} compact />);

    const time = screen.getByText("۱۴:۳۰");
    expect(screen.queryByText("14:30")).not.toBeInTheDocument();
    expect(time.parentElement).toHaveClass("flex", "gap-2");
    // compact hides the status badge
    expect(screen.queryByText("تکمیل شده")).not.toBeInTheDocument();
  });
});
