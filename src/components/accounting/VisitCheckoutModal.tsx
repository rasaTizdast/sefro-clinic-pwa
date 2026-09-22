import { useEffect, useState } from "react";

import { useProductsList, useServicesList, useVisit } from "../../hooks/api";
import { listServiceItems } from "../../services/serviceItems";
import type { ConsumptionSelection } from "../../types/finance";
import { CheckoutModal } from "./CheckoutModal";

interface VisitCheckoutModalProps {
  visitId: number;
  onClose: () => void;
}

/**
 * Shared visit-bound checkout modal: fetches visit details and services internally,
 * totals the visit's service prices, and prefills the consumables step from each
 * service's registered consumables.
 */
export function VisitCheckoutModal({ visitId, onClose }: VisitCheckoutModalProps) {
  const { data: appointment, isLoading: visitLoading } = useVisit(visitId);
  const { data: servicesData, isLoading: servicesLoading } = useServicesList({ perPage: 200 });
  const { data: productsData } = useProductsList({ perPage: 100 });

  const [consumables, setConsumables] = useState<ConsumptionSelection | null>(null);

  const services = servicesData?.data ?? [];
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const totalToman =
    appointment?.services.reduce((sum, id) => sum + (serviceMap.get(id)?.price ?? 0), 0) ?? 0;

  useEffect(() => {
    if (!appointment) return;
    let cancelled = false;
    Promise.all(
      appointment.services.map(async (serviceId) => {
        const items = await listServiceItems(serviceId);
        return [
          serviceId,
          items.map((item) => ({ product: item.product, quantity: item.quantity })),
        ] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) setConsumables(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) setConsumables({});
      });
    return () => {
      cancelled = true;
    };
  }, [appointment]);

  const productNames: Record<number, string> = {};
  for (const p of productsData?.data ?? []) productNames[p.id] = p.name;

  const serviceNames: Record<number, string> = {};
  for (const s of services) serviceNames[s.id] = s.title;

  if (visitLoading || servicesLoading) {
    return (
      <CheckoutModal
        open
        onClose={onClose}
        customerId={0}
        visitId={visitId}
        defaultTotalToman={0}
      />
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <CheckoutModal
      open
      onClose={onClose}
      customerId={appointment.customer}
      visitId={appointment.id}
      defaultTotalToman={totalToman}
      consumables={consumables ?? undefined}
      productNames={productNames}
      serviceNames={serviceNames}
    />
  );
}
