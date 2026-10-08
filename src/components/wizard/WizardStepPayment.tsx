import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MdPayment } from "react-icons/md";

import { useAllWelcomePacks, useCheckout, useWelcomePack } from "../../hooks/api";
import { useCreateCustomer } from "../../hooks/api/useCustomersQuery";
import { useCurrentRate } from "../../hooks/api/useExchangeRatesQuery";
import { useRecordConsumption } from "../../hooks/api/useInventoryFinanceQuery";
import { useAllProducts } from "../../hooks/api/useProductsQuery";
import { useReserveVisit } from "../../hooks/api/useVisitsQuery";
import { useIssueWelcomePack } from "../../hooks/api/useWelcomePacksQuery";
import { extractApiError } from "../../lib/api-error";
import { formatUsd } from "../../lib/currency";
import { toShamsiDateInput } from "../../lib/date";
import { toPersianDigits } from "../../lib/digits";
import {
  consumableLineToman,
  consumablesTotalToman,
  formatPrice,
  hasInvalidConsumableQuantity,
} from "../../lib/format";
import {
  isSplitComplete,
  parseTomanInput,
  parseUsdInput,
  splitPaidToman,
} from "../../lib/payment-split";
import { queryKeys } from "../../lib/query-keys";
import { getBillingRate } from "../../services/exchangeRates";
import { buildCheckoutPayload, partitionVisitPayment } from "../../services/sales";
import * as visitsService from "../../services/visits";
import type { ConsumptionSelection } from "../../types/finance";
import type {
  ConsumableSelection,
  PatientData,
  PaymentSelection,
  ServiceSelection,
  WelcomePackSelection,
} from "../../types/wizard";
import { PaymentSplitFields } from "../accounting/PaymentSplitFields";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { useToast } from "../ui/Toast";
import { UsdTag } from "../ui/UsdTag";

interface Props {
  patient: PatientData;
  selectedServices: ServiceSelection[];
  consumables: Record<string, ConsumableSelection[]>;
  extraProducts: ConsumableSelection[];
  welcomePack: WelcomePackSelection | null;
  onSelectWelcomePack: (pack: WelcomePackSelection | null) => void;
  onBack: () => void;
  onComplete: (payment: PaymentSelection) => void;
  /** Persists the server-assigned customer id back into the tab so a retry cannot re-create the patient. */
  onUpdatePatient: (patient: PatientData) => void;
}

export default function WizardStepPayment({
  patient,
  selectedServices,
  consumables,
  extraProducts,
  welcomePack,
  onSelectWelcomePack,
  onBack,
  onComplete,
  onUpdatePatient,
}: Props) {
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const queryClient = useQueryClient();
  const [cashToman, setCashToman] = useState("");
  const [cashUsd, setCashUsd] = useState("");
  const [cardToman, setCardToman] = useState("");
  const [welcomeMode, setWelcomeMode] = useState<"with" | "without">(
    welcomePack ? "with" : "without"
  );
  const [formError, setFormError] = useState("");

  const isPackage = selectedServices.some((s) => s.isPackage);
  const packageId = selectedServices.find((s) => s.isPackage)?.packageId ?? null;
  const serviceIds = useMemo(
    () =>
      selectedServices.filter((s) => !s.isPackage && s.serviceId).map((s) => s.serviceId as number),
    [selectedServices]
  );

  // Service/package fee (customer-billable).
  const serviceFeeTotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + parseTomanInput(s.priceToman), 0),
    [selectedServices]
  );

  // Billable consumables + extra warehouse products (customer-billable).
  const consumableTotal = useMemo(
    () => consumablesTotalToman(consumables, extraProducts),
    [consumables, extraProducts]
  );

  // Final customer payable: fee + goods + consumables.
  const totalToman = serviceFeeTotal + consumableTotal;

  const checkoutMutation = useCheckout();
  const reserveMutation = useReserveVisit();
  const consumptionMutation = useRecordConsumption();
  const issuePackMutation = useIssueWelcomePack();
  const createCustomerMutation = useCreateCustomer();

  const { data: currentRate } = useCurrentRate();
  const rate = useMemo(() => {
    const raw = currentRate?.rateTomanPerUsd ?? currentRate?.rate;
    const parsed = Number(raw);
    return raw != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [currentRate]);

  const cashNum = parseTomanInput(cashToman);
  const cardNum = parseTomanInput(cardToman);
  const cashUsdNum = parseUsdInput(cashUsd);
  const paidTotal = splitPaidToman(cashNum, cardNum, cashUsdNum, rate);
  const remaining = totalToman - paidTotal;
  const isComplete = isSplitComplete(totalToman, cashNum, cardNum, cashUsdNum, rate);
  const consumablesInvalid = hasInvalidConsumableQuantity(consumables, extraProducts);
  // A chosen pack with no configured price blocks checkout until it is fixed.
  // Toman alone is not decisive: a pack priced only in USD is still priced, so
  // the selection is invalid only when BOTH currencies come back empty or zero.
  const welcomePackInvalid =
    welcomePack !== null &&
    parseTomanInput(welcomePack.totalCostToman ?? "0") <= 0 &&
    parseUsdInput(welcomePack.totalCostUsd ?? "0") <= 0;

  // A pack priced only in USD still has a price — derive the displayed Toman
  // amount from the current rate instead of showing ۰ تومان beside a real
  // dollar figure. The server re-derives the final amount at issue time.
  const tomanOf = (toman: string | null | undefined, usd: string | null | undefined): number => {
    const direct = parseTomanInput(toman ?? "0");
    if (direct > 0) return direct;
    const usdNum = parseUsdInput(usd ?? "0");
    return usdNum > 0 && rate !== null ? Math.round(usdNum * rate) : 0;
  };

  // Only numeric service-id keys go to record-consumption (pkg:* keys are bill-only).
  const serviceIdKeySet = useMemo(() => new Set(serviceIds.map(String)), [serviceIds]);

  const { data: packsData } = useAllWelcomePacks({ isActive: true });
  // Fresh detail of the chosen pack: its standalone items (welcome-pack-items),
  // distinct from the per-service consumables above.
  const { data: selectedPackDetail } = useWelcomePack(welcomePack?.packId ?? 0);
  const { data: productsData } = useAllProducts();
  const productNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of productsData ?? []) map.set(p.id, p.name);
    return map;
  }, [productsData]);

  const consumableRows = useMemo(() => {
    const recipeRows = Object.entries(consumables).flatMap(([key, rows]) =>
      rows.map((r) => ({
        serviceId: key.startsWith("pkg:") ? null : Number(key),
        kind: (key.startsWith("pkg:") ? "package" : "recipe") as "package" | "recipe",
        ...r,
      }))
    );
    const extraRows = extraProducts.map((r) => ({
      serviceId: null,
      kind: "extra" as const,
      ...r,
    }));
    return [...recipeRows, ...extraRows];
  }, [consumables, extraProducts]);

  const isPending =
    reserveMutation.isPending ||
    checkoutMutation.isPending ||
    consumptionMutation.isPending ||
    issuePackMutation.isPending ||
    createCustomerMutation.isPending;

  const handleFinish = async () => {
    setFormError("");
    if (!isComplete) return;
    if (consumablesInvalid) {
      toastError("تعداد مواد مصرفی نامعتبر است");
      return;
    }
    if (welcomePackInvalid) {
      toastError("قیمت ولکام‌پک انتخاب‌شده تعیین نشده است");
      return;
    }

    // Never price the sale from the cached quote: checkout re-derives every
    // cash component with the server's own rate and rejects the sale when the
    // two disagree. Resolve it fresh, right before we post.
    const billingRate = await getBillingRate();
    if (billingRate === null) {
      toastError("نرخ ارز در دسترس نیست");
      return;
    }
    if (billingRate !== rate) {
      // Sync the UI to the rate the server will use, then re-check the split
      // under it — a moved rate changes ceil(usd × rate), so the receptionist
      // must re-confirm the amount instead of us silently posting a mismatch.
      queryClient.setQueryData(queryKeys.finance.currentRate, {
        rate: String(billingRate),
        rateTomanPerUsd: String(billingRate),
        effectiveAt: null,
        source: "checkout",
      });
      if (!isSplitComplete(totalToman, cashNum, cardNum, cashUsdNum, billingRate)) {
        setFormError("نرخ ارز به‌روز شد — مبلغ پرداخت را با نرخ جدید تنظیم کنید.");
        return;
      }
    }

    // Rollback markers: a failure before the first sale lands must release the
    // reservation, otherwise every retry piles up a «در انتظار» visit.
    let reservedVisitId: number | null = null;
    let saleBooked = false;

    try {
      // 1. Ensure the patient exists (new-patient form only holds local data until here).
      let customerId: number | null = patient.id;
      if (customerId == null) {
        const created = await createCustomerMutation.mutateAsync({
          firstName: patient.firstName,
          lastName: patient.lastName,
          mobileNumber: patient.mobileNumber,
          nationalId: patient.nationalId,
          bitmojiCode: "",
          notes: patient.notes,
          birthday: patient.birthday,
          fileSysId: patient.fileSysId,
        });
        const createdId: number = (created as unknown as { data: { id: number } }).data.id;
        customerId = createdId;
        // Keep the id in the tab so a failed attempt does not create the patient twice.
        onUpdatePatient({ ...patient, id: createdId });
      }
      const finalCustomerId: number = customerId as number;

      // 2. Reserve the visit with real service ids (packages ride on the sale, not the visit).
      const now = new Date();
      const dateStr = toShamsiDateInput(now);
      const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const reserveRes = await reserveMutation.mutateAsync({
        customer: finalCustomerId,
        services: serviceIds,
        date: dateStr,
        time: timeStr,
        notes: `پذیرش سریع - ${patient.firstName} ${patient.lastName}`,
      });
      const visitId: number = (reserveRes as unknown as { data: { id: number } }).data.id;
      reservedVisitId = visitId;

      // 3. Record recipe consumables AND manual extras («محصولات این صورتحساب»)
      //    for stock/ProductUsage (billable amounts already included in totalToman).
      //    Both are posted in one call: recipe items (mandatory defaults included)
      //    plus the extra_products list — the backend rejects nothing here anymore,
      //    it deducts stock for extras too. Failure must not block billing.
      const recipeSelection = Object.fromEntries(
        Object.entries(consumables).filter(
          ([key, rows]) => rows.length > 0 && serviceIdKeySet.has(key)
        )
      ) as ConsumptionSelection;
      let consumptionFailure: unknown = null;
      try {
        await consumptionMutation.mutateAsync({
          visitId,
          selection: recipeSelection,
          includeMandatoryOnly: true,
          extraProducts,
        });
      } catch (consumptionError) {
        consumptionFailure = consumptionError;
      }

      // 4. Checkout the bill as TWO sales so staff compensation is computed from
      //    services only: the service fee rides on the visit-bound sale, the
      //    consumables/products on a visit-less sale (products must never inflate
      //    an operator's share). Exact partitioning is not always possible with
      //    heavy-USD payments — then one combined sale books the whole visit.
      const description = `پذیرش ${patient.firstName} ${patient.lastName}`;
      const parts =
        serviceFeeTotal > 0 && consumableTotal > 0
          ? partitionVisitPayment({
              serviceFeeToman: serviceFeeTotal,
              totalToman,
              rate: billingRate,
              cashToman: cashNum,
              cardToman: cardNum,
              cashUsd: cashUsdNum,
            })
          : null;
      const payload = parts
        ? buildCheckoutPayload({
            customerId: finalCustomerId,
            visitId,
            packageId,
            totalToman: serviceFeeTotal,
            rate: billingRate,
            cashToman: parts.service.cashToman,
            cardToman: parts.service.cardToman,
            cashUsd: parts.service.cashUsd,
            description,
          })
        : buildCheckoutPayload({
            customerId: finalCustomerId,
            visitId,
            packageId,
            totalToman,
            rate: billingRate,
            cashToman: cashNum,
            cardToman: cardNum,
            cashUsd: cashUsdNum > 0 ? cashUsdNum.toFixed(2) : 0,
            description,
          });
      await checkoutMutation.mutateAsync(payload);
      saleBooked = true;
      if (parts) {
        try {
          await checkoutMutation.mutateAsync(
            buildCheckoutPayload({
              customerId: finalCustomerId,
              visitId: null,
              packageId: null,
              totalToman: consumableTotal,
              rate: billingRate,
              cashToman: parts.goods.cashToman,
              cardToman: parts.goods.cardToman,
              cashUsd: parts.goods.cashUsd,
              description,
            })
          );
        } catch (goodsError) {
          // The service sale already exists; a goods failure must not undo it.
          toastWarning("خدمت ثبت شد اما فروش محصولات ثبت نشد", extractApiError(goodsError));
        }
      }

      // 5. Issue the welcome pack against the same customer+visit (its own financial event).
      if (welcomePack) {
        try {
          await issuePackMutation.mutateAsync({
            packId: welcomePack.packId,
            customer: finalCustomerId,
            quantity: "1",
            visit: visitId,
          });
        } catch (packError) {
          // The sale and the visit are already recorded — a pack failure (e.g. not
          // enough stock) must not block the patient from being checked out.
          toastWarning("پذیرش ثبت شد اما ولکام‌پک صادر نشد", extractApiError(packError));
        }
      }

      if (consumptionFailure) {
        // Billing landed; only the stock note is missing. Say it plainly.
        toastWarning("پذیرش ثبت شد اما مصرف مواد ثبت نشد", extractApiError(consumptionFailure));
      }

      toastSuccess(`پذیرش ${patient.firstName} ${patient.lastName} با موفقیت ثبت شد`);
      onComplete({
        method: cardNum > 0 ? "card" : "cash",
        amountUsd: String(paidTotal),
        cashToman: cashNum,
        cardToman: cardNum,
        cashUsd: cashUsdNum > 0 ? cashUsdNum.toFixed(2) : "0",
      });
    } catch (err: unknown) {
      // Nothing was billed: release the reservation so a failed checkout never
      // leaves a phantom «در انتظار» visit on the dashboard.
      if (reservedVisitId !== null && !saleBooked) {
        try {
          await visitsService.cancelVisit(reservedVisitId);
          await queryClient.invalidateQueries({ queryKey: queryKeys.visits.all });
        } catch {
          // Secondary to the original failure — keep reporting that one.
        }
      }
      const msg = extractApiError(err);
      setFormError(msg);
      toastError(msg);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-surface-900 text-lg font-bold">پرداخت و خلاصه مالی</h2>
      <p className="text-surface-500 text-sm">
        بیمار: {patient.firstName} {patient.lastName}
      </p>

      {formError && <Alert variant="error">{formError}</Alert>}
      {consumablesInvalid && (
        <Alert variant="warning">
          تعداد برخی اقلام مواد مصرفی نامعتبر است — آنها را اصلاح کنید.
        </Alert>
      )}
      {welcomePackInvalid && (
        <Alert variant="warning">
          قیمت ولکام‌پک انتخاب‌شده تعیین نشده است — آن را اصلاح یا انتخابش را بردارید.
        </Alert>
      )}

      {/* Services / package — customer charge */}
      <div className="border-surface-200 space-y-1 rounded-lg border p-3">
        <h3 className="text-surface-700 text-sm font-medium">خدمات و پکیج (مبلغ پرداختی بیمار)</h3>
        {selectedServices.map((s, i) => (
          <div key={`${s.serviceId}-${i}`} className="flex items-center justify-between text-sm">
            <span className="text-surface-700">
              {s.isPackage ? `پکیج: ${s.serviceName}` : s.serviceName}
            </span>
            <span className="flex flex-col items-end gap-0.5">
              <span className="text-surface-600">
                {formatPrice(parseTomanInput(s.priceToman))} تومان
              </span>
              <UsdTag toman={parseTomanInput(s.priceToman)} rate={rate} />
            </span>
          </div>
        ))}
        <div className="border-surface-200 mt-2 flex justify-between border-t pt-2">
          <span className="text-surface-600">جمع اجرا</span>
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-surface-700">{formatPrice(serviceFeeTotal)} تومان</span>
            <UsdTag toman={serviceFeeTotal} rate={rate} />
          </span>
        </div>
      </div>

      {/* Consumables — billable to the patient */}
      {consumableRows.length > 0 && (
        <div className="border-surface-200 space-y-1 rounded-lg border p-3">
          <h3 className="text-surface-700 text-sm font-medium">
            مواد مصرفی و محصولات (مبلغ پرداختی بیمار)
          </h3>
          {consumableRows.map((row, i) => (
            <div key={`${row.product}-${i}`} className="flex items-center justify-between text-xs">
              <span className="text-surface-600">
                {row.productName || productNames.get(row.product) || `محصول ${row.product}`} ×{" "}
                {toPersianDigits(row.quantity)}
                {row.kind === "extra" && <span className="text-surface-400"> (محصول اضافی)</span>}
                {row.kind === "package" && <span className="text-surface-400"> (پکیج)</span>}
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <span className="text-surface-700 font-medium whitespace-nowrap">
                  {formatPrice(consumableLineToman(row))} تومان
                </span>
                <UsdTag toman={consumableLineToman(row)} rate={rate} />
              </span>
            </div>
          ))}
          <div className="border-surface-200 mt-2 flex justify-between border-t pt-2">
            <span className="text-surface-600">جمع مواد مصرفی</span>
            <span className="flex flex-col items-end gap-0.5">
              <span className="text-surface-700">{formatPrice(consumableTotal)} تومان</span>
              <UsdTag toman={consumableTotal} rate={rate} />
            </span>
          </div>
        </div>
      )}

      {/* Final payable summary */}
      <div className="border-primary-200 bg-primary-50 space-y-1 rounded-lg border p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-surface-700">اجرت خدمت و پکیج</span>
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-surface-800">{formatPrice(serviceFeeTotal)} تومان</span>
            <UsdTag toman={serviceFeeTotal} rate={rate} />
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-surface-700">مواد مصرفی و محصولات</span>
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-surface-800">{formatPrice(consumableTotal)} تومان</span>
            <UsdTag toman={consumableTotal} rate={rate} />
          </span>
        </div>
        <div className="border-primary-200 mt-1 flex items-center justify-between border-t pt-2 font-bold">
          <span className="text-surface-900">جمع قابل پرداخت</span>
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-primary-700">{formatPrice(totalToman)} تومان</span>
            <UsdTag toman={totalToman} rate={rate} />
          </span>
        </div>
      </div>

      {/* Welcome pack — two explicit options: with / without */}
      <div className="border-surface-200 space-y-3 rounded-lg border p-3">
        <h3 className="text-surface-700 text-sm font-medium">ولکام‌پک</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setWelcomeMode("without");
              onSelectWelcomePack(null);
            }}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              welcomeMode === "without"
                ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                : "border-surface-200 text-surface-600 hover:bg-surface-50"
            }`}
          >
            بدون ولکام‌پک
          </button>
          <button
            type="button"
            onClick={() => setWelcomeMode("with")}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              welcomeMode === "with"
                ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                : "border-surface-200 text-surface-600 hover:bg-surface-50"
            }`}
          >
            همراه با ولکام‌پک
          </button>
        </div>
        {welcomeMode === "with" && (
          <>
            <Select
              label="انتخاب ولکام‌پک"
              options={[
                { value: "", label: "یک ولکام‌پک انتخاب کنید" },
                ...(packsData ?? []).map((p) => ({
                  value: String(p.id),
                  label: `${p.name} — ${formatPrice(
                    tomanOf(p.totalCostToman, p.totalCostUsd)
                  )} تومان / ${formatUsd(p.totalCostUsd ?? "0")}`,
                })),
              ]}
              value={welcomePack ? String(welcomePack.packId) : ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const pack = (packsData ?? []).find((p) => p.id === id) ?? null;
                onSelectWelcomePack(
                  pack
                    ? {
                        packId: pack.id,
                        packName: pack.name,
                        totalCostToman: pack.totalCostToman,
                        totalCostUsd: pack.totalCostUsd,
                      }
                    : null
                );
              }}
            />
            {welcomePack && (
              <div className="bg-surface-50 space-y-1 rounded-md p-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-surface-700 font-medium">{welcomePack.packName}</span>
                  <span className="text-primary-700 font-medium">
                    {formatPrice(tomanOf(welcomePack.totalCostToman, welcomePack.totalCostUsd))}{" "}
                    تومان
                  </span>
                  <span className="text-info-700 font-medium" dir="ltr">
                    {formatUsd(welcomePack.totalCostUsd ?? "0")}
                  </span>
                </div>
                <p className="text-surface-500 text-xs">
                  هزینه داخلی، تراکنش جداگانه هنگام صدور (نه بخشی از مبلغ پرداختی)
                </p>
                {selectedPackDetail && selectedPackDetail.items.length > 0 && (
                  <ul className="text-surface-600 space-y-0.5 text-xs">
                    {selectedPackDetail.items.map((item) => (
                      <li key={item.id}>
                        {item.productName} × {toPersianDigits(item.quantity)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {isPackage && (
        <Alert variant="info">پکیج روی فاکتور فروش ثبت می‌شود؛ نوبت فقط شامل خدمات پایه است.</Alert>
      )}

      <div className="border-surface-200 bg-surface-50 space-y-3 rounded-lg border p-4">
        <h3 className="text-surface-700 text-sm font-medium">مبلغ پرداخت (چند روشی)</h3>
        <PaymentSplitFields
          cashToman={cashToman}
          cashUsd={cashUsd}
          cardToman={cardToman}
          totalToman={totalToman}
          paidToman={paidTotal}
          remaining={remaining}
          isComplete={isComplete}
          onCashTomanChange={setCashToman}
          onCashUsdChange={setCashUsd}
          onCardTomanChange={setCardToman}
        />
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          بازگشت
        </Button>
        <Button
          variant="primary"
          startIcon={<MdPayment className="size-4" />}
          onClick={handleFinish}
          disabled={!isComplete || isPending || consumablesInvalid || welcomePackInvalid}
          loading={isPending}
        >
          ثبت نهایی
        </Button>
      </div>
    </div>
  );
}
