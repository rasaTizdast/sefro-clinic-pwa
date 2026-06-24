import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Tab } from "../Tabs";
import { TabPanel, Tabs } from "../Tabs";

const tabs: Tab[] = [
  { id: "info", label: "اطلاعات" },
  { id: "history", label: "تاریخچه" },
  { id: "docs", label: "مستندات", badge: 5 },
];

describe("Tabs", () => {
  it("renders all tabs", () => {
    render(<Tabs tabs={tabs} activeTab="info" onChange={() => {}} />);
    expect(screen.getByText("اطلاعات")).toBeInTheDocument();
    expect(screen.getByText("تاریخچه")).toBeInTheDocument();
    expect(screen.getByText("مستندات")).toBeInTheDocument();
  });

  it("has role tablist", () => {
    render(<Tabs tabs={tabs} activeTab="info" onChange={() => {}} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders tabs with role tab", () => {
    render(<Tabs tabs={tabs} activeTab="info" onChange={() => {}} />);
    const tabElements = screen.getAllByRole("tab");
    expect(tabElements).toHaveLength(3);
  });

  it("sets aria-selected on active tab", () => {
    render(<Tabs tabs={tabs} activeTab="history" onChange={() => {}} />);
    const historyTab = screen.getByText("تاریخچه").closest("button");
    expect(historyTab).toHaveAttribute("aria-selected", "true");
  });

  it("sets aria-selected false on inactive tab", () => {
    render(<Tabs tabs={tabs} activeTab="info" onChange={() => {}} />);
    const historyTab = screen.getByText("تاریخچه").closest("button");
    expect(historyTab).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange when tab clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs tabs={tabs} activeTab="info" onChange={onChange} />);
    await user.click(screen.getByText("تاریخچه"));
    expect(onChange).toHaveBeenCalledWith("history");
  });

  it("applies active styles to active tab", () => {
    render(<Tabs tabs={tabs} activeTab="info" onChange={() => {}} />);
    const infoTab = screen.getByText("اطلاعات").closest("button");
    expect(infoTab).toHaveClass("text-primary-700");
  });

  it("applies inactive styles to inactive tab", () => {
    render(<Tabs tabs={tabs} activeTab="info" onChange={() => {}} />);
    const historyTab = screen.getByText("تاریخچه").closest("button");
    expect(historyTab).toHaveClass("text-surface-500");
  });

  it("renders badge count", () => {
    render(<Tabs tabs={tabs} activeTab="info" onChange={() => {}} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    const tabsWithIcon = [
      { id: "home", label: "خانه", icon: <span data-testid="icon">🏠</span> },
    ];
    render(<Tabs tabs={tabsWithIcon} activeTab="home" onChange={() => {}} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});

describe("TabPanel", () => {
  it("renders children when id matches activeTab", () => {
    render(<TabPanel id="info" activeTab="info"><p>محتوا</p></TabPanel>);
    expect(screen.getByText("محتوا")).toBeInTheDocument();
  });

  it("does not render children when id does not match activeTab", () => {
    render(<TabPanel id="history" activeTab="info"><p>محتوا</p></TabPanel>);
    expect(screen.queryByText("محتوا")).not.toBeInTheDocument();
  });

  it("has role tabpanel when visible", () => {
    render(<TabPanel id="info" activeTab="info">محتوا</TabPanel>);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("has aria-labelledby when visible", () => {
    render(<TabPanel id="info" activeTab="info">محتوا</TabPanel>);
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "info");
  });

  it("applies custom className", () => {
    const { container } = render(
      <TabPanel id="info" activeTab="info" className="custom-panel">محتوا</TabPanel>
    );
    expect(container.firstChild).toHaveClass("custom-panel");
  });
});