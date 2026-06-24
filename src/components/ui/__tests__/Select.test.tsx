import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Select } from "../Select";

const options = [
  { value: "1", label: "گزینه یک" },
  { value: "2", label: "گزینه دو" },
  { value: "3", label: "گزینه سه" },
];

describe("Select as dropdown", () => {
  it("renders with placeholder when no value selected", () => {
    render(<Select placeholder="انتخاب کنید" options={options} />);
    expect(screen.getByText("انتخاب کنید")).toBeInTheDocument();
  });

  it("renders selected label when value is set", () => {
    render(<Select value="2" options={options} />);
    expect(screen.getByText("گزینه دو")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<Select label="وضعیت" options={options} />);
    expect(screen.getByText("وضعیت")).toBeInTheDocument();
  });

  it("opens dropdown on trigger click", async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("closes dropdown on second click", async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("selects option on click and closes dropdown", async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("گزینه دو"));
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
    expect(screen.getByText("گزینه دو")).toBeInTheDocument();
  });

  it("calls onChange when option selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Select options={options} onChange={onChange} />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("گزینه سه"));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].target.value).toBe("3");
  });

  it("renders error message with role alert", () => {
    render(<Select options={options} error="این فیلد الزامی است" />);
    expect(screen.getByRole("alert")).toHaveTextContent("این فیلد الزامی است");
  });

  it("sets aria-invalid when error present", () => {
    render(<Select options={options} error="خطا" />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
  });

  it("disables the trigger when disabled", () => {
    render(<Select options={options} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("does not open dropdown when disabled", async () => {
    const user = userEvent.setup();
    render(<Select options={options} disabled />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("renders search input when searchable", async () => {
    const user = userEvent.setup();
    render(<Select options={options} searchable />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByPlaceholderText("جستجو...")).toBeInTheDocument();
  });

  it("filters options when searchable", async () => {
    const user = userEvent.setup();
    render(<Select options={options} searchable />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("جستجو..."), "دو");
    expect(screen.getByText("گزینه دو")).toBeInTheDocument();
    expect(screen.queryByText("گزینه یک")).not.toBeInTheDocument();
  });

  it("shows not found message when search yields no results", async () => {
    const user = userEvent.setup();
    render(<Select options={options} searchable />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("جستجو..."), "xyz");
    expect(screen.getByText("موردی یافت نشد")).toBeInTheDocument();
  });

  it("supports controlled value", async () => {
    const user = userEvent.setup();
    render(<Select value="1" options={options} />);
    expect(screen.getAllByText("گزینه یک").length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("گزینه دو"));
    await waitFor(() => {
      expect(screen.getAllByText("گزینه یک").length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("Select as action menu", () => {
  it("renders custom trigger", () => {
    render(<Select trigger={<span data-testid="custom-trigger">منو</span>} items={[]} />);
    expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
  });

  it("opens menu on trigger click", async () => {
    const user = userEvent.setup();
    render(<Select trigger={<span>منو</span>} items={[{ label: "اکشن", onClick: vi.fn() }]} />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("renders menu items", async () => {
    const user = userEvent.setup();
    render(
      <Select
        trigger={<span>منو</span>}
        items={[
          { label: "ویرایش", onClick: vi.fn() },
          { label: "حذف", onClick: vi.fn() },
        ]}
      />
    );
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("ویرایش")).toBeInTheDocument();
    expect(screen.getByText("حذف")).toBeInTheDocument();
  });

  it("calls onClick when menu item clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Select trigger={<span>منو</span>} items={[{ label: "اکشن", onClick }]} />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("اکشن"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("closes menu after item click", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Select trigger={<span>منو</span>} items={[{ label: "اکشن", onClick }]} />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("اکشن"));
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("renders divider", async () => {
    const user = userEvent.setup();
    render(
      <Select trigger={<span>منو</span>} items={[{ divider: true }]} />
    );
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("renders disabled item", async () => {
    const user = userEvent.setup();
    render(
      <Select trigger={<span>منو</span>} items={[{ label: "غیرفعال", disabled: true, onClick: vi.fn() }]} />
    );
    await user.click(screen.getByRole("combobox"));
    const disabledItem = screen.getByText("غیرفعال").closest("button");
    expect(disabledItem).toBeDisabled();
  });

  it("renders danger variant", async () => {
    const user = userEvent.setup();
    render(
      <Select trigger={<span>منو</span>} items={[{ label: "حذف", danger: true, onClick: vi.fn() }]} />
    );
    await user.click(screen.getByRole("combobox"));
    const dangerItem = screen.getByText("حذف").closest("button");
    expect(dangerItem).toHaveClass("text-danger-600");
  });
});