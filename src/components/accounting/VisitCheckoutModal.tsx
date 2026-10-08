import { useEffect, useMemo, useState } from "react";

import { useAllProducts, useAllServices, useVisit } from "../../hooks/api";
import { useRateValue } from "../../hooks/useRateValue";
import { consumableLineToman, consumablesTotalToman, serviceLiveToman } from "../../lib/format";
import { listServiceItems } from "../../services/serviceItems";
import type { ConsumptionSelection } from "../../types/finance";
import type { ConsumableSelection, WelcomePackSelection } from "../../types/wizard";
import { CheckoutModal } from "./CheckoutModal";

interface VisitCheckoutModalProps {
  visitId: number;
  onClose: () => void;
  /** Booking-time extras persisted client-side (`/visits/reserve/` can't store them). */
  extraProducts?: ConsumableSelection[];
  welcomePack?: WelcomePackSelection | null;
  /** Fired after the sale (and welcome pack, if any) is recorded successfully. */
  onSuccess?: () => void;
}

/**
 * Shared visit-bound checkout modal: fetches visit details and services internally,
 * totals the visit's service prices plus billable consumables (service recipes ×
 * product unit customer price), and prefills the consumables step.
 *
 * Booking-time extras are billed here but NOT sent to record-consumption: the
 * backend only accepts products in the service recipe, so extra warehouse
 * products are bill-only (same rule as the /wizard payment step).
 */
export function VisitCheckoutModal({
  visitId,
  onClose,
  extraProducts = [],
  welcomePack = null,
  onSuccess,
}: VisitCheckoutModalProps) {
  const { data: appointment, isLoading: visitLoading } = useVisit(visitId);
  const { data: servicesData, isLoading: servicesLoading } = useAllServices();
  const { data: productsData, isLoading: productsLoading } = useAllProducts();
  const rate = useRateValue();

  const [consumables, setConsumables] = useState<ConsumptionSelection | null>(null);

  const services = useMemo(() => servicesData ?? [], [servicesData]);
  const serviceMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const productMap = useMemo(
    () => new Map((productsData ?? []).map((p) => [p.id, p])),
    [productsData]
  );

  const serviceFeeTotal = useMemo(() => {
    if (!appointment) return 0;
    return appointment.services.reduce((sum, id) => {
      const svc = serviceMap.get(id);
      if (!svc) {
        console.warn(`[VisitCheckoutModal] Service ${id} not found in loaded services`);
        return sum;
      }
      return sum + serviceLiveToman(svc, rate);
    }, 0);
  }, [appointment, serviceMap, rate]);

  const consumableTotal = useMemo(() => {
    if (!consumables) return 0;
    let total = 0;
    for (const rows of Object.values(consumables)) {
      for (const row of rows) {
        const product = productMap.get(row.product);
        const selection: ConsumableSelection = {
          product: row.product,
          productName: product?.name ?? "",
          quantity: row.quantity,
          priceToman: product?.unitPrice ?? "0",
          priceUsd: product?.unitPriceUsd ?? "0",
        };
        total += consumableLineToman(selection);
      }
    }
    return total;
  }, [consumables, productMap]);

  const extraTotal = useMemo(() => consumablesTotalToman({}, extraProducts), [extraProducts]);
  const totalToman = serviceFeeTotal + consumableTotal + extraTotal;

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
  for (const p of productsData ?? []) productNames[p.id] = p.name;

  const serviceNames: Record<number, string> = {};
  for (const s of services) serviceNames[s.id] = s.title;

  if (visitLoading || servicesLoading || productsLoading || !appointment || consumables === null) {
    return (
      <CheckoutModal
        key="loading"
        open
        onClose={onClose}
        customerId={0}
        visitId={visitId}
        defaultTotalToman={0}
      />
    );
  }

  // Key on the computed total: CheckoutModal seeds its money state from
  // defaultTotalToman at mount, so remounting is what carries the real
  // (post-load) total into مبلغ کل / نقدی instead of the loading placeholder.
  return (
    <CheckoutModal
      key={`total-${totalToman}`}
      open
      onClose={onClose}
      customerId={appointment.customer}
      visitId={appointment.id}
      defaultTotalToman={totalToman}
      serviceFeeToman={serviceFeeTotal}
      consumables={consumables}
      productNames={productNames}
      serviceNames={serviceNames}
      extraProducts={extraProducts}
      welcomePack={welcomePack}
      onSuccess={onSuccess}
    />
  );
}
