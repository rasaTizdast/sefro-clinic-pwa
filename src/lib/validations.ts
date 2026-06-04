import { z } from "zod/v4";

import { toLatinDigits } from "./digits";

const DIGIT_ONLY = /^[\d۰-۹٠-٩]+$/;
const NAME_PATTERN = /^[^\d۰-۹٠-٩]+$/;

export const patientFormSchema = z.object({
  firstName: z
    .string()
    .min(2, "نام باید حداقل ۲ کاراکتر باشد")
    .regex(NAME_PATTERN, "نام نباید شامل اعداد باشد"),
  lastName: z
    .string()
    .min(2, "نام خانوادگی باید حداقل ۲ کاراکتر باشد")
    .regex(NAME_PATTERN, "نام خانوادگی نباید شامل اعداد باشد"),
  phone: z
    .string()
    .regex(DIGIT_ONLY, "شماره تلفن باید فقط شامل اعداد باشد")
    .refine((v) => toLatinDigits(v).length === 11, {
      message: "شماره تلفن باید ۱۱ رقم باشد",
    }),
  nationalId: z
    .string()
    .regex(DIGIT_ONLY, "کد ملی باید فقط شامل اعداد باشد")
    .refine((v) => toLatinDigits(v).length === 10, {
      message: "کد ملی باید ۱۰ رقم باشد",
    }),
  bitmojiId: z.string().optional(),
});

export type PatientFormSchema = z.infer<typeof patientFormSchema>;
