import { BiError } from "react-icons/bi";
import { useNavigate } from "react-router";

import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <EmptyState
        icon={<BiError className="size-16" />}
        title="صفحه مورد نظر یافت نشد"
        description="صفحه‌ای که به دنبال آن هستید وجود ندارد یا حذف شده است."
        action={
          <Button variant="primary" onClick={() => navigate("/")}>
            صفحه اصلی
          </Button>
        }
      />
    </div>
  );
}
