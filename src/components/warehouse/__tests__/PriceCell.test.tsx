import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PriceCell } from "../PriceCell";

describe("PriceCell", () => {
  it("shows current toman with drift arrow and USD line; original price moves to tooltip", () => {
    render(<PriceCell description="usd:11.5|orig:1200000" rate={100000} />);
    // Line 1: live toman (11.5 × 100000 = 1,150,000, rounded up) with the down arrow
    expect(screen.getByText("۱٬۱۵۰٬۰۰۰")).toBeInTheDocument();
    expect(screen.getByLabelText("قیمت پایین آمده")).toBeInTheDocument();
    // Line 2: USD anchor
    expect(screen.getByText("$۱۱.۵۰")).toBeInTheDocument();
    // Original price kept out of the cell, shown on hover instead
    expect(screen.queryByText("۱٬۲۰۰٬۰۰۰")).not.toBeInTheDocument();
    expect(screen.getByTitle("قیمت ثبت‌شده: ۱٬۲۰۰٬۰۰۰ تومان")).toBeInTheDocument();
    // No strikethrough, no neutral marker
    expect(document.querySelector(".line-through")).toBeNull();
    expect(screen.queryByLabelText("بدون تغییر")).not.toBeInTheDocument();
  });

  it("shows a single toman line without marker when price hasn't changed", () => {
    render(<PriceCell description="usd:10|orig:1000000" rate={100000} />);
    // Unchanged price appears exactly once (original only lives in the tooltip)
    const prices = screen.getAllByText("۱٬۰۰۰٬۰۰۰");
    expect(prices).toHaveLength(1);
    expect(prices[0].closest("span")).not.toHaveClass("text-surface-400");
    expect(screen.getByText("$۱۰.۰۰")).toBeInTheDocument();
    expect(screen.queryByLabelText("بدون تغییر")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("قیمت بالا رفته")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("قیمت پایین آمده")).not.toBeInTheDocument();
    expect(screen.queryByTitle(/قیمت ثبت‌شده/)).not.toBeInTheDocument();
    expect(document.querySelector(".line-through")).toBeNull();
  });

  it("shows up arrow when current toman is higher than original", () => {
    render(<PriceCell description="usd:10|orig:1000000" rate={110000} />);
    expect(screen.getByText("۱٬۱۰۰٬۰۰۰")).toBeInTheDocument();
    expect(screen.getByLabelText("قیمت بالا رفته")).toBeInTheDocument();
    expect(screen.getByText("$۱۰.۰۰")).toBeInTheDocument();
    expect(screen.getByTitle("قیمت ثبت‌شده: ۱٬۰۰۰٬۰۰۰ تومان")).toBeInTheDocument();
    expect(screen.queryByLabelText("بدون تغییر")).not.toBeInTheDocument();
    expect(document.querySelector(".line-through")).toBeNull();
  });

  it("shows down arrow when current toman is lower than original", () => {
    render(<PriceCell description="usd:10|orig:1000000" rate={90000} />);
    expect(screen.getByText("۹۰۰٬۰۰۰")).toBeInTheDocument();
    expect(screen.getByText("$۱۰.۰۰")).toBeInTheDocument();
    expect(screen.getByLabelText("قیمت پایین آمده")).toBeInTheDocument();
    expect(screen.queryByLabelText("بدون تغییر")).not.toBeInTheDocument();
    expect(document.querySelector(".line-through")).toBeNull();
  });

  it("shows derived USD under the toman price when only toman and rate given (no anchor)", () => {
    render(<PriceCell toman="1150000" rate={100000} />);
    expect(screen.getByText("۱٬۱۵۰٬۰۰۰")).toBeInTheDocument();
    expect(screen.getByText("تومان")).toBeInTheDocument();
    expect(screen.getByText("$۱۱.۵۰")).toBeInTheDocument();
  });

  it("hides dollar line when rate is null", () => {
    render(<PriceCell toman="1150000" rate={null} />);
    expect(screen.getByText("۱٬۱۵۰٬۰۰۰")).toBeInTheDocument();
    expect(screen.getByText("تومان")).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("shows explicit USD and toman when usd prop given (no description)", () => {
    render(<PriceCell usd="10.00" rate={110000} />);
    const usdElements = screen.getAllByText("$۱۰.۰۰");
    expect(usdElements.length).toBeGreaterThanOrEqual(1);
    // No original toman, no trend (no anchor in description)
    expect(screen.queryByLabelText("قیمت بالا رفته")).not.toBeInTheDocument();
  });

  it("renders an em dash when there is nothing to show", () => {
    render(<PriceCell />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("keeps the trend arrow visible with a self-stopping CSS bounce", () => {
    const { rerender } = render(<PriceCell description="usd:10|orig:1000000" rate={100000} />);
    // Initially no drift → no marker at all
    expect(screen.queryByLabelText("بدون تغییر")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("قیمت بالا رفته")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("قیمت پایین آمده")).not.toBeInTheDocument();

    // Change rate to trigger up trend — arrow appears
    rerender(<PriceCell description="usd:10|orig:1000000" rate={110000} />);
    const arrow = screen.getByLabelText("قیمت بالا رفته");
    // Bounce is a finite CSS animation (no JS timer) — it plays ~1s and stops on
    // its own while the arrow itself persists as a direction marker.
    expect(arrow.style.animation).toContain("price-bounce");
    expect(arrow).toHaveClass("text-success-600");
  });

  it("drops the arrow when the price returns to the original", () => {
    const { rerender } = render(<PriceCell description="usd:10|orig:1000000" rate={110000} />);
    expect(screen.getByLabelText("قیمت بالا رفته")).toBeInTheDocument();

    rerender(<PriceCell description="usd:10|orig:1000000" rate={100000} />);
    expect(screen.queryByLabelText("قیمت بالا رفته")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("قیمت پایین آمده")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("بدون تغییر")).not.toBeInTheDocument();
    expect(document.querySelector(".line-through")).toBeNull();
  });
});
