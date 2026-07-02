import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PatientFormModal } from "../PatientFormModal";

describe("PatientFormModal", () => {
  it("renders with new patient title by default", () => {
    render(<PatientFormModal onClose={() => {}} onSave={async () => {}} />);
    expect(screen.getByText("بیمار جدید")).toBeInTheDocument();
  });

  it("renders edit title when initialData provided", () => {
    render(
      <PatientFormModal
        onClose={() => {}}
        onSave={async () => {}}
        initialData={{
          firstName: "علی",
          lastName: "رضایی",
          mobileNumber: "09121234567",
          nationalId: "0012345678",
          bitmojiCode: "",
          notes: "",
        }}
      />
    );
    expect(screen.getByText("ویرایش بیمار")).toBeInTheDocument();
  });

  it("shows input values from initialData", () => {
    render(
      <PatientFormModal
        onClose={() => {}}
        onSave={async () => {}}
        initialData={{
          firstName: "علی",
          lastName: "رضایی",
          mobileNumber: "09121234567",
          nationalId: "0012345678",
          bitmojiCode: "bitmoji_123",
          notes: "یادداشت آزمایشی",
        }}
      />
    );
    expect(screen.getByDisplayValue("علی")).toBeInTheDocument();
    expect(screen.getByDisplayValue("رضایی")).toBeInTheDocument();
    expect(screen.getByDisplayValue("09121234567")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0012345678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("bitmoji_123")).toBeInTheDocument();
    expect(screen.getByDisplayValue("یادداشت آزمایشی")).toBeInTheDocument();
  });

  it("disables save button when required fields are empty", () => {
    render(<PatientFormModal onClose={() => {}} onSave={async () => {}} />);
    expect(screen.getByRole("button", { name: "ذخیره" })).toBeDisabled();
  });

  it("enables save button when required fields filled", async () => {
    const user = userEvent.setup();
    render(<PatientFormModal onClose={() => {}} onSave={async () => {}} />);

    await user.type(screen.getByLabelText("نام"), "علی");
    await user.type(screen.getByLabelText("نام خانوادگی"), "رضایی");
    await user.type(screen.getByLabelText("شماره تلفن"), "09121234567");
    await user.type(screen.getByLabelText("کد ملی"), "0012345678");

    expect(screen.getByRole("button", { name: "ذخیره" })).not.toBeDisabled();
  });

  it("calls onClose when cancel clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PatientFormModal onClose={onClose} onSave={async () => {}} />);
    await user.click(screen.getByRole("button", { name: "انصراف" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onSave and onClose on successful submit", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<PatientFormModal onClose={onClose} onSave={onSave} />);

    await user.type(screen.getByLabelText("نام"), "علی");
    await user.type(screen.getByLabelText("نام خانوادگی"), "رضایی");
    await user.type(screen.getByLabelText("شماره تلفن"), "09121234567");
    await user.type(screen.getByLabelText("کد ملی"), "0012345678");

    await user.click(screen.getByRole("button", { name: "ذخیره" }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows field errors on zod validation failure", async () => {
    const user = userEvent.setup();
    render(<PatientFormModal onClose={() => {}} onSave={async () => {}} />);

    await user.type(screen.getByLabelText("نام"), "علی");
    await user.type(screen.getByLabelText("نام خانوادگی"), "ر");
    await user.type(screen.getByLabelText("شماره تلفن"), "0912abc");
    await user.type(screen.getByLabelText("کد ملی"), "0012345678");

    const saveBtn = screen.getByRole("button", { name: "ذخیره" });
    expect(saveBtn).not.toBeDisabled();
    await user.click(saveBtn);

    expect(await screen.findByText("نام خانوادگی باید حداقل ۲ کاراکتر باشد")).toBeInTheDocument();
    expect(await screen.findByText("شماره تلفن باید ۱۱ رقم باشد")).toBeInTheDocument();
  });

  it("shows alert error on save failure", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("خطای سرور"));
    const user = userEvent.setup();

    render(<PatientFormModal onClose={() => {}} onSave={onSave} />);

    await user.type(screen.getByLabelText("نام"), "علی");
    await user.type(screen.getByLabelText("نام خانوادگی"), "رضایی");
    await user.type(screen.getByLabelText("شماره تلفن"), "09121234567");
    await user.type(screen.getByLabelText("کد ملی"), "0012345678");

    await user.click(screen.getByRole("button", { name: "ذخیره" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("خطای سرور");
  });

  it("strips digits from name fields", async () => {
    const user = userEvent.setup();
    render(<PatientFormModal onClose={() => {}} onSave={async () => {}} />);

    const nameInput = screen.getByLabelText("نام");
    await user.type(nameInput, "علی123");
    expect(nameInput).toHaveValue("علی");
  });

  it("strips non-digits from mobile field", async () => {
    const user = userEvent.setup();
    render(<PatientFormModal onClose={() => {}} onSave={async () => {}} />);

    const mobileInput = screen.getByLabelText("شماره تلفن");
    await user.type(mobileInput, "0912abc3456");
    expect(mobileInput).toHaveValue("09123456");
  });

  it("shows loading state on save", async () => {
    let resolveSave: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const onSave = vi.fn().mockReturnValue(savePromise);
    const user = userEvent.setup();

    render(<PatientFormModal onClose={() => {}} onSave={onSave} />);

    await user.type(screen.getByLabelText("نام"), "علی");
    await user.type(screen.getByLabelText("نام خانوادگی"), "رضایی");
    await user.type(screen.getByLabelText("شماره تلفن"), "09121234567");
    await user.type(screen.getByLabelText("کد ملی"), "0012345678");

    await user.click(screen.getByRole("button", { name: "ذخیره" }));
    expect(screen.getByRole("button", { name: "ذخیره" })).toBeDisabled();

    resolveSave!();
  });

  it("disables inputs when isPending is true", () => {
    render(<PatientFormModal onClose={() => {}} onSave={async () => {}} isPending />);
    expect(screen.getByLabelText("نام")).toBeDisabled();
  });
});
