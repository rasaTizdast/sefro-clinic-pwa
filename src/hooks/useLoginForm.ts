import { useActionState } from "react";

import { useToast } from "../components/ui";
import type { LoginState } from "../types/auth";

const PERSIAN_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";

const normalizeIdentifier = (value: string) =>
  value.trim().replace(/[۰-۹٠-٩]/g, (digit) => String(PERSIAN_ARABIC_DIGITS.indexOf(digit) % 10));

const validate = (identifier: string, password: string): LoginState["errors"] => {
  const errors: LoginState["errors"] = {};
  const username = normalizeIdentifier(identifier);

  if (!username) {
    errors.identifier = "شماره موبایل یا نام کاربری را وارد کنید.";
  } else if (username.length < 3) {
    errors.identifier = "شناسه ورود باید حداقل ۳ کاراکتر باشد.";
  }

  if (!password) {
    errors.password = "رمز عبور را وارد کنید.";
  } else if (password.length < 6) {
    errors.password = "رمز عبور باید حداقل ۶ کاراکتر باشد.";
  }

  return errors;
};

export const useLoginForm = () => {
  const toast = useToast();

  const [state, formAction, isPending] = useActionState(
    async (_prevState: LoginState, formData: FormData): Promise<LoginState> => {
      const identifier = (formData.get("identifier") as string) ?? "";
      const password = (formData.get("password") as string) ?? "";
      const rememberMe = formData.get("rememberMe") === "on";

      const errors = validate(identifier, password);

      if (Object.keys(errors).length > 0) {
        toast.warning("اطلاعات ورود کامل نیست", "لطفا موارد مشخص شده را بررسی کنید.");
        return {
          status: "error",
          errors,
          message: "لطفا خطاهای زیر را برطرف کنید.",
          rememberMe,
        };
      }

      toast.success("ورود موفق", "به پنل مدیریت خوش آمدید.");

      return {
        status: "success",
        errors: {},
        message: `خوش آمدید، ${normalizeIdentifier(identifier)}`,
        rememberMe,
      };
    },
    { status: "idle", errors: {}, message: null, rememberMe: true } as LoginState
  );

  return { state, formAction, isPending };
};
