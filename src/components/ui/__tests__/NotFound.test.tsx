import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { NotFound } from "../NotFound";

describe("NotFound", () => {
  it("renders page not found title", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByText("صفحه مورد نظر یافت نشد")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByText(/صفحه‌ای که به دنبال آن هستید وجود ندارد/)).toBeInTheDocument();
  });

  it("renders navigation button to home", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: "صفحه اصلی" })).toBeInTheDocument();
  });

  it("renders icon", () => {
    const { container } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});