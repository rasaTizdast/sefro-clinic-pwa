import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Column } from "../Table";
import { Table } from "../Table";

interface User {
  id: number;
  name: string;
  role: string;
}

const columns: Column<User>[] = [
  { key: "name", header: "نام", sortable: true },
  { key: "role", header: "نقش" },
];

const data: User[] = [
  { id: 1, name: "علی", role: "مدیر" },
  { id: 2, name: "سارا", role: "کاربر" },
];

describe("Table", () => {
  it("renders all data rows (in desktop or mobile view)", () => {
    render(
      <Table
        columns={columns}
        data={data}
        rowKey={(item) => item.id}
      />
    );
    expect(screen.getAllByText("علی").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("سارا").length).toBeGreaterThanOrEqual(1);
  });

  it("renders column headers (in desktop or mobile view)", () => {
    render(
      <Table
        columns={columns}
        data={data}
        rowKey={(item) => item.id}
      />
    );
    expect(screen.getAllByText("نام").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("نقش").length).toBeGreaterThanOrEqual(1);
  });

  it("renders sort icon on sortable columns", () => {
    const { container } = render(
      <Table
        columns={columns}
        data={data}
        rowKey={(item) => item.id}
      />
    );
    const svgs = container.querySelectorAll("thead svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("does not render sort icon on non-sortable columns", () => {
    const cols: Column<User>[] = [
      { key: "name", header: "نام" },
    ];
    const { container } = render(
      <Table
        columns={cols}
        data={data}
        rowKey={(item) => item.id}
      />
    );
    const svgs = container.querySelectorAll("thead svg");
    expect(svgs.length).toBe(0);
  });

  it("calls onSort when clicking sortable header", async () => {
    const onSort = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Table
        columns={columns}
        data={data}
        onSort={onSort}
        rowKey={(item) => item.id}
      />
    );
    const desktopHeaders = container.querySelectorAll("th");
    await user.click(desktopHeaders[0]);
    expect(onSort).toHaveBeenCalledWith("name");
  });

  it("applies aria-sort on active sorted column", () => {
    const { container } = render(
      <Table
        columns={columns}
        data={data}
        sortKey="name"
        sortDirection="asc"
        rowKey={(item) => item.id}
      />
    );
    const header = container.querySelector("th");
    expect(header).toHaveAttribute("aria-sort", "ascending");
  });

  it("renders loading skeleton rows", () => {
    const { container } = render(
      <Table
        columns={columns}
        data={[]}
        loading
        rowKey={(item) => item.id}
      />
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it("renders empty message when no data and not loading", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        emptyMessage="داده‌ای یافت نشد"
        rowKey={(item) => item.id}
      />
    );
    expect(screen.getAllByText("داده‌ای یافت نشد").length).toBeGreaterThanOrEqual(1);
  });

  it("uses default empty message when not provided", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        rowKey={(item) => item.id}
      />
    );
    expect(screen.getAllByText("داده‌ای یافت نشد").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onRowClick when clicking a row", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Table
        columns={columns}
        data={data}
        onRowClick={onRowClick}
        rowKey={(item) => item.id}
      />
    );
    const desktopRow = container.querySelectorAll("tbody tr")[1];
    await user.click(desktopRow);
    expect(onRowClick).toHaveBeenCalledWith(data[1]);
  });

  it("renders custom cell content via render function", () => {
    const cols: Column<User>[] = [
      { key: "name", header: "نام", render: (user) => `👤 ${user.name}` },
    ];
    render(
      <Table
        columns={cols}
        data={data}
        rowKey={(item) => item.id}
      />
    );
    expect(screen.getAllByText("👤 علی").length).toBeGreaterThanOrEqual(1);
  });

  it("applies custom className", () => {
    const { container } = render(
      <Table
        columns={columns}
        data={data}
        className="custom-table"
        rowKey={(item) => item.id}
      />
    );
    const outerDiv = container.querySelector('[class*="custom-table"]');
    expect(outerDiv).toBeInTheDocument();
  });

  it("renders row with correct key", () => {
    const { container } = render(
      <Table
        columns={columns}
        data={data}
        rowKey={(item) => item.name}
      />
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
  });
});