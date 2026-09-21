import { useCurrentRate } from "../../hooks/api";
import { formatPrice } from "../../lib/format";
import { Card, CardTitle } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

export function ExchangeRateCard() {
  const { data: rate, isLoading } = useCurrentRate();

  if (isLoading) {
    return (
      <Card variant="outlined" padding="lg">
        <Skeleton width="50%" height="1rem" />
        <Skeleton width="30%" height="2rem" className="mt-2" />
      </Card>
    );
  }

  return (
    <Card variant="outlined" padding="lg">
      <CardTitle>نرخ ارز</CardTitle>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-surface-900 text-2xl font-bold">
          {rate ? formatPrice(Number(rate.rateTomanPerUsd)) : "—"}
        </span>
        <span className="text-surface-500 text-sm">تومان / دلار</span>
      </div>
      {rate?.source && <p className="text-surface-400 mt-1 text-xs">منبع: {rate.source}</p>}
    </Card>
  );
}
