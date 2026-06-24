import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Pagination } from "../Pagination";

describe("Pagination", () => {
  it("renders page buttons", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("highlights current page", () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={() => {}} />);
    const page3 = screen.getByText("3").closest("button");
    expect(page3).toHaveClass("bg-primary-600");
  });

  it("does not highlight inactive pages", () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={() => {}} />);
    const page2 = screen.getByText("2").closest("button");
    expect(page2).not.toHaveClass("bg-primary-600");
  });

  it("sets aria-current on active page", () => {
    render(<Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />);
    expect(screen.getByText("1").closest("button")).toHaveAttribute("aria-current", "page");
  });

  it("renders previous and next buttons", () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Next page")).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText("Next page")).toBeDisabled();
  });

  it("enables next button when not on last page", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText("Next page")).not.toBeDisabled();
  });

  it("enables previous button when not on first page", () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText("Previous page")).not.toBeDisabled();
  });

  it("calls onPageChange with next page", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);
    await user.click(screen.getByLabelText("Next page"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with previous page", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />);
    await user.click(screen.getByLabelText("Previous page"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with page number when clicking a page", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);
    await user.click(screen.getByText("3"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("renders ellipsis when total pages > 7", () => {
    render(<Pagination currentPage={5} totalPages={20} onPageChange={() => {}} />);
    const ellipsis = screen.getAllByText("...");
    expect(ellipsis.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render ellipsis when total pages <= 7", () => {
    render(<Pagination currentPage={3} totalPages={7} onPageChange={() => {}} />);
    expect(screen.queryByText("...")).not.toBeInTheDocument();
  });

  it("returns null when totalPages <= 1", () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all page numbers when totalPages <= 7", () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("renders first and last page always", () => {
    render(<Pagination currentPage={10} totalPages={20} onPageChange={() => {}} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={3} onPageChange={() => {}} className="custom-nav" />
    );
    expect(container.firstChild).toHaveClass("custom-nav");
  });
});