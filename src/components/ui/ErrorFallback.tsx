import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";

import { Button } from "./Button";
import { Card, CardDescription, CardHeader, CardTitle } from "./Card";

function getErrorMessage(error: unknown): { title: string; description: string; code?: number } {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        code: 404,
        title: "صفحه مورد نظر یافت نشد",
        description: "صفحه‌ای که به دنبال آن هستید وجود ندارد یا حذف شده است.",
      };
    }
    if (error.status === 401) {
      return {
        code: 401,
        title: "دسترسی محدود",
        description: "شما مجوز دسترسی به این صفحه را ندارید. لطفاً وارد حساب خود شوید.",
      };
    }
    if (error.status === 403) {
      return {
        code: 403,
        title: "دسترسی ممنوع",
        description: "شما به این بخش دسترسی ندارید.",
      };
    }
    if (error.status === 500) {
      return {
        code: 500,
        title: "خطای سرور",
        description: "مشکلی در سرور رخ داده است. لطفاً چند دقیقه بعد تلاش کنید.",
      };
    }
    return {
      code: error.status,
      title: "خطا",
      description: error.statusText || "مشکلی پیش آمده است.",
    };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("chunk") ||
      msg.includes("loading") ||
      msg.includes("fetch") ||
      msg.includes("network")
    ) {
      return {
        title: "خطا در بارگذاری صفحه",
        description:
          "صفحه مورد نظر به درستی بارگذاری نشد. لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً تلاش کنید.",
      };
    }
  }

  return {
    title: "خطای غیرمنتظره",
    description: "متأسفانه خطایی رخ داده است. لطفاً صفحه را بازبینی کنید.",
  };
}

export function ErrorFallback() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { code, title, description } = getErrorMessage(error);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card variant="outlined" padding="lg" className="w-full max-w-md text-center">
        <CardHeader className="flex-col justify-center">
          {code && <span className="text-danger-600 mb-2 block text-5xl font-bold">{code}</span>}
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-2 max-w-sm">{description}</CardDescription>
        </CardHeader>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>
            تلاش مجدد
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            صفحه اصلی
          </Button>
        </div>
      </Card>
    </div>
  );
}
