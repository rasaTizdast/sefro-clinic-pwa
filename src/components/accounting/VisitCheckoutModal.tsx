import { useEffect, useState } from "react";

import { useProductsList } from "../../hooks/api";
import { listServiceItems } from "../../services/serviceItems";
import type { Appointment } from "../../types/appointment";
import type { ConsumptionSelection } from "../../types/finance";
import type { Service } from "../../types/service";
import { CheckoutModal } from "./CheckoutModal";

interface VisitCheckoutModalProps {
  appointment: Appointment;
  services: Service[];
  onClose: () => void;
}

/**
 * Visit-bound checkout: totals the visit's service prices and prefills the
 * «ثبت مصرف مواد» step from each service's registered consumables.
 */
export function VisitCheckoutModal({ appointment, services, onClose }: VisitCheckoutModalProps) {
  const [consumables, setConsumables] = useState<ConsumptionSelection | null>(null);
  const { data: productsData } = useProductsList({ perPage: 100 });

  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const totalToman = appointment.services.reduce(
    (sum, id) => sum + (serviceMap.get(id)?.price ?? 0),
    0
  );

  useEffect(() => {
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
