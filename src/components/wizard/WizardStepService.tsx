import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BiSearch, BiTrash } from "react-icons/bi";
import {
  MdAddCircleOutline,
  MdCheckCircle,
  MdDelete,
  MdInventory2,
  MdMedicalServices,
} from "react-icons/md";
import { PiPackageBold } from "react-icons/pi";

import { usePackage, usePackagesList } from "../../hooks/api/usePackagesQuery";
import { useAllProducts } from "../../hooks/api/useProductsQuery";
import { useServiceItems } from "../../hooks/api/useServiceItemsQuery";
import { useServicesList } from "../../hooks/api/useServicesQuery";
import { useRateValue } from "../../hooks/useRateValue";
import { toLatinDigits, toPersianDigits } from "../../lib/digits";
import { productToConsumable } from "../../lib/extra-products";
import {
  consumableLineToman,
  consumablesTotalToman,
  formatPrice,
  parseTomanAmount,
  serviceLiveToman,
} from "../../lib/format";
import type { WarehouseItem } from "../../types/warehouse";
import type { ConsumableSelection, PatientData, ServiceSelection } from "../../types/wizard";
import { Alert } from "../ui/Alert";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { UsdTag } from "../ui/UsdTag";
import { ExtraProductsBlock } from "./ExtraProductsBlock";

interface Props {
  patient: PatientData;
  selectedServices: ServiceSelection[];
  consumables: Record<string, ConsumableSelection[]>;
  extraProducts: ConsumableSelection[];
  onBack: () => void;
  onUpdateServices: (services: ServiceSelection[]) => void;
  onUpdateConsumables: (consumables: Record<string, ConsumableSelection[]>) => void;
  onUpdateExtraProducts: (extraProducts: ConsumableSelection[]) => void;
  onComplete: (services: ServiceSelection[]) => void;
}

/** Consumables map key for a package selection (distinct from numeric service ids). */
function packageConsumablesKey(packageId: number): string {
  return `pkg:${packageId}`;
}

export default function WizardStepService({
  patient,
  selectedServices,
  consumables,
  extraProducts,
  onBack,
  onUpdateServices,
  onUpdateConsumables,
  onUpdateExtraProducts,
  onComplete,
}: Props) {
  const [tab, setTab] = useState<"services" | "packages">("services");
  const [query, setQuery] = useState("");
  const rate = useRateValue();

  /**
   * Merge-safe consumable updates: consecutive seeds/edits (multiple recipe blocks,
   * quantity changes) must not overwrite each other with a stale `consumables` snapshot.
   * The ref advances inside the push so the next push sees the previous push's keys;
   * props sync via effect when the parent commits a new value.
   */
  const consumablesRef = useRef(consumables);
  useEffect(() => {
    consumablesRef.current = consumables;
  }, [consumables]);

  const pushConsumables = useCallback(
    (
      update:
        | Record<string, ConsumableSelection[]>
        | ((prev: Record<string, ConsumableSelection[]>) => Record<string, ConsumableSelection[]>)
    ) => {
      const prev = consumablesRef.current;
      const next = typeof update === "function" ? update(prev) : update;
      consumablesRef.current = next;
      onUpdateConsumables(next);
    },
    [onUpdateConsumables]
  );

  const setKeyedConsumables = useCallback(
    (key: string, rows: ConsumableSelection[]) => {
      pushConsumables((prev) => ({ ...prev, [key]: rows }));
    },
    [pushConsumables]
  );

  const extraRef = useRef(extraProducts);
  useEffect(() => {
    extraRef.current = extraProducts;
  }, [extraProducts]);

  const pushExtraProducts = useCallback(
    (update: ConsumableSelection[] | ((prev: ConsumableSelection[]) => ConsumableSelection[])) => {
      const prev = extraRef.current;
      const next = typeof update === "function" ? update(prev) : update;
      extraRef.current = next;
      onUpdateExtraProducts(next);
    },
    [onUpdateExtraProducts]
  );

  const { data: servicesResponse } = useServicesList({
    search: query || undefined,
    perPage: 50,
  });

  const { data: packagesResponse } = usePackagesList({
    search: query || undefined,
    perPage: 50,
  });

  const services = servicesResponse?.data ?? [];
  const packages = packagesResponse?.data ?? [];

  const selectedServiceIds = useMemo(
    () => new Set(selectedServices.filter((s) => !s.isPackage).map((s) => s.serviceId)),
    [selectedServices]
  );
  const selectedPackageId = useMemo(
    () => selectedServices.find((s) => s.isPackage)?.packageId ?? null,
    [selectedServices]
  );

  const addService = useCallback(
    (svc: {
      id: number;
      name: string;
      priceToman: string;
      priceUsd: string;
      isPackage?: boolean;
      packageId?: number | null;
    }) => {
      if (svc.isPackage) {
        onUpdateServices([
          {
            serviceId: svc.id,
            serviceName: svc.name,
            priceToman: svc.priceToman,
            priceUsd: svc.priceUsd,
            isPackage: true,
            packageId: svc.packageId ?? svc.id,
          },
        ]);
        // Package replaces individual services; keep extra warehouse products.
        // PackageConsumablesBlock will re-seed the pkg:* key from package items.
        pushConsumables({});
        return;
      }
      const withoutPackage = selectedServices.filter((s) => !s.isPackage);
      const exists = withoutPackage.some((s) => s.serviceId === svc.id);
      if (exists) return;
      const hadPackage = selectedServices.some((s) => s.isPackage);
      onUpdateServices([
        ...withoutPackage,
        {
          serviceId: svc.id,
          serviceName: svc.name,
          priceToman: svc.priceToman,
          priceUsd: svc.priceUsd,
          isPackage: false,
          packageId: null,
        },
      ]);
      // Switching from package → services: drop orphaned pkg:* recipe keys.
      if (hadPackage) {
        pushConsumables((prev) => {
          const pruned = Object.fromEntries(
            Object.entries(prev).filter(([k]) => !k.startsWith("pkg:"))
          );
          return Object.keys(pruned).length !== Object.keys(prev).length ? pruned : prev;
        });
      }
    },
    [selectedServices, onUpdateServices, pushConsumables]
  );

  const removeService = useCallback(
    (idx: number) => {
      const next = selectedServices.filter((_, i) => i !== idx);
      onUpdateServices(next);
      const removed = selectedServices[idx];
      if (removed?.isPackage && removed.packageId != null) {
        const key = packageConsumablesKey(removed.packageId);
        pushConsumables((prev) => {
          if (!(key in prev)) return prev;
          const rest = { ...prev };
          delete rest[key];
          return rest;
        });
        return;
      }
      if (removed && !removed.isPackage && removed.serviceId != null) {
        const key = String(removed.serviceId);
        pushConsumables((prev) => {
          if (!(key in prev)) return prev;
          const rest = { ...prev };
          delete rest[key];
          return rest;
        });
      }
    },
    [selectedServices, onUpdateServices, pushConsumables]
  );

  const serviceFeeTotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + parseTomanAmount(s.priceToman), 0),
    [selectedServices]
  );

  const consumableTotal = useMemo(
    () => consumablesTotalToman(consumables, extraProducts),
    [consumables, extraProducts]
  );

  const grandTotal = serviceFeeTotal + consumableTotal;
  const serviceCount = selectedServices.filter((s) => !s.isPackage).length;
  const hasPackage = selectedServices.some((s) => s.isPackage);
  const hasSelection = selectedServices.length > 0;

  const reservedProductIds = useMemo(
    () =>
      new Set(
        [...Object.values(consumables), extraProducts].flatMap((rows) => rows.map((r) => r.product))
      ),
    [consumables, extraProducts]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-surface-400 mb-0.5 flex items-center gap-1.5 text-xs font-medium">
            <span className="bg-primary-600 flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-white">
              2
            </span>
            انتخاب خدمت و مواد مصرفی
          </div>
          <h2 className="text-surface-900 text-lg font-bold">خدمت یا پکیج</h2>
          <p className="text-surface-500 mt-0.5 text-sm">
            بیمار:{" "}
            <span className="text-surface-700 font-medium">
              {patient.firstName} {patient.lastName}
            </span>
          </p>
        </div>
        {hasSelection && (
          <div className="flex flex-col items-end gap-1">
            <Badge variant="info" size="sm" className="gap-1.5">
              <MdCheckCircle className="size-3" />
              {serviceCount > 0 ? `${serviceCount} خدمت` : ""}
              {hasPackage && serviceCount > 0 && " + "}
              {hasPackage && "۱ پکیج"}
            </Badge>
            <span className="text-surface-500 text-xs">
              جمع کل:{" "}
              <span className="text-surface-900 font-bold">{formatPrice(grandTotal)} تومان</span>
              <UsdTag toman={grandTotal} rate={rate} variant="inline" />
            </span>
          </div>
        )}
      </div>

      {/* Catalog */}
      <Card variant="outlined" padding="none" className="overflow-hidden">
        <div className="border-surface-200 flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center">
          <div className="flex gap-2" role="tablist" aria-label="نوع انتخاب">
            <Button
              role="tab"
              aria-selected={tab === "services"}
              variant={tab === "services" ? "primary" : "outline"}
              size="sm"
              onClick={() => setTab("services")}
              className="gap-2"
              startIcon={<MdAddCircleOutline className="size-4" />}
            >
              خدمات
              {serviceCount > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white/90">
                  {serviceCount}
                </span>
              )}
            </Button>
            <Button
              role="tab"
              aria-selected={tab === "packages"}
              variant={tab === "packages" ? "primary" : "outline"}
              size="sm"
              onClick={() => setTab("packages")}
              className="gap-2"
              startIcon={<PiPackageBold className="size-4" />}
            >
              پکیج‌ها
              {hasPackage && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white/90">
                  ۱
                </span>
              )}
            </Button>
          </div>
          <div className="flex-1 sm:max-w-xs">
            <Input
              placeholder="جستجو..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              endIcon={<BiSearch className="text-surface-400 size-4" />}
              className="w-full"
              containerClassName="w-full"
            />
          </div>
        </div>
        <div className="bg-surface-50 border-surface-200 border-b px-3 py-2">
          <p className="text-surface-500 text-xs font-medium">
            {tab === "services"
              ? `مجموع ${services.length} خدمت — چندخدمت قابل انتخاب است`
              : `مجموع ${packages.length} پکیج — فقط یک پکیج قابل انتخاب است`}
          </p>
        </div>
        <div className="divide-surface-100 max-h-64 divide-y overflow-y-auto">
          {tab === "services" ? (
            services.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <BiSearch className="text-surface-300 mb-2 size-10" />
                <p className="text-surface-400 text-sm">خدمتی یافت نشد</p>
              </div>
            ) : (
              services.map((s) => {
                const isSelected = selectedServiceIds.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      addService({
                        id: s.id,
                        name: s.title,
                        priceToman: String(serviceLiveToman(s, rate)),
                        priceUsd: String(s.priceUsd ?? "0"),
                      })
                    }
                    disabled={isSelected}
                    className={`flex w-full items-center gap-3 p-3 text-right transition-all duration-150 ${
                      isSelected
                        ? "bg-primary-50 border-primary-600 border-r-2"
                        : "hover:bg-primary-50 hover:border-primary-300 hover:border-r-2"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="relative min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-medium ${
                          isSelected ? "text-primary-700" : "text-surface-800"
                        }`}
                      >
                        {s.title}
                      </span>
                      {s.description && (
                        <span className="text-surface-400 mt-0.5 block truncate text-xs">
                          {s.description}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-primary-600 text-sm font-medium">
                        {formatPrice(serviceLiveToman(s, rate))} تومان
                      </span>
                      <span className="text-surface-400 text-xs">
                        ${toPersianDigits(String(s.priceUsd ?? "0"))}
                      </span>
                      {isSelected && (
                        <MdCheckCircle
                          className="text-primary-600 size-5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>
                );
              })
            )
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <PiPackageBold className="text-surface-300 mb-2 size-10" />
              <p className="text-surface-400 text-sm">پکیجی یافت نشد</p>
            </div>
          ) : (
            packages.map((p) => {
              const isSelected = selectedPackageId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    addService({
                      id: p.id,
                      name: p.name,
                      priceToman: String(parseTomanAmount(p.priceToman ?? 0)),
                      priceUsd: p.priceUsd,
                      isPackage: true,
                      packageId: p.id,
                    })
                  }
                  disabled={isSelected}
                  className={`flex w-full items-start gap-3 p-3 text-right transition-all duration-150 ${
                    isSelected
                      ? "bg-primary-50 border-primary-600 border-r-2"
                      : "hover:bg-primary-50 hover:border-primary-300 hover:border-r-2"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="relative min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`block truncate text-sm font-medium ${
                          isSelected ? "text-primary-700" : "text-surface-800"
                        }`}
                      >
                        {p.name}
                      </span>
                      {isSelected && (
                        <MdCheckCircle
                          className="text-primary-600 size-4 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    {p.description && (
                      <span className="text-surface-400 mt-0.5 block truncate text-xs">
                        {p.description}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-primary-600 text-sm font-medium">
                      {formatPrice(parseTomanAmount(p.priceToman))} تومان
                    </span>
                    <span className="text-surface-400 text-xs">
                      ${toPersianDigits(String(p.priceUsd ?? "0"))}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* Selection summary */}
      {hasSelection && (
        <Card variant="outlined" padding="md" className="bg-surface-50/50">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-surface-700 flex items-center gap-2 text-sm font-medium">
              <span className="bg-primary-100 text-primary-700 flex size-5 items-center justify-center rounded-full text-[11px] font-bold">
                ✓
              </span>
              انتخاب شده
            </h3>
          </div>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {selectedServices.map((s, i) => (
              <div
                key={`${s.serviceId}-${i}`}
                className="border-surface-200 flex items-center justify-between gap-2 rounded-lg border bg-white p-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Badge variant={s.isPackage ? "info" : "default"} size="sm" className="shrink-0">
                    {s.isPackage ? (
                      <>
                        <PiPackageBold className="me-1 size-3" />
                        پکیج
                      </>
                    ) : (
                      <>
                        <MdMedicalServices className="me-1 size-3" />
                        خدمت
                      </>
                    )}
                  </Badge>
                  <span className="text-surface-800 truncate text-sm">{s.serviceName}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-surface-600 text-xs whitespace-nowrap">
                    {formatPrice(parseTomanAmount(s.priceToman))} تومان
                    <UsdTag toman={parseTomanAmount(s.priceToman)} rate={rate} variant="inline" />
                  </span>
                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    className="text-danger-500 hover:text-danger-700 hover:bg-danger-50 rounded p-1 transition-colors"
                    aria-label={`حذف ${s.serviceName}`}
                  >
                    <MdDelete className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Consumables — billable whenever anything is selected (service or package) */}
      {hasSelection && (
        <Card variant="outlined" padding="md">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-surface-700 flex items-center gap-2 text-sm font-medium">
              <MdInventory2 className="text-info-600 size-4" />
              مواد مصرفی و محصولات
            </h3>
          </div>

          <div className="space-y-2">
            {selectedServices
              .filter((s) => !s.isPackage && s.serviceId != null)
              .map((s) => (
                <ServiceConsumablesBlock
                  key={s.serviceId}
                  serviceId={s.serviceId as number}
                  serviceName={s.serviceName}
                  selection={consumables[String(s.serviceId)] ?? []}
                  onUserChange={(rows) => setKeyedConsumables(String(s.serviceId), rows)}
                />
              ))}
            {selectedServices
              .filter((s) => s.isPackage && s.packageId != null)
              .map((s) => (
                <PackageConsumablesBlock
                  key={s.packageId}
                  packageId={s.packageId as number}
                  packageName={s.serviceName}
                  selection={consumables[packageConsumablesKey(s.packageId as number)] ?? []}
                  onUserChange={(rows) =>
                    setKeyedConsumables(packageConsumablesKey(s.packageId as number), rows)
                  }
                />
              ))}
          </div>

          <ExtraProductsBlock
            extraProducts={extraProducts}
            onChange={pushExtraProducts}
            reservedProductIds={reservedProductIds}
          />

          {consumableTotal > 0 && (
            <div className="border-surface-200 mt-3 flex items-center justify-between border-t pt-2 text-sm">
              <span className="text-surface-600">جمع مواد مصرفی و محصولات</span>
              <span className="flex flex-col items-end gap-0.5">
                <span className="text-surface-900 font-bold">
                  {formatPrice(consumableTotal)} تومان
                </span>
                <UsdTag toman={consumableTotal} rate={rate} />
              </span>
            </div>
          )}
          {consumableTotal === 0 && (
            <p className="text-surface-500 mt-2 text-xs">
              تعداد اقلام را تغییر دهید یا محصول اضافه کنید تا به جمع کل اضافه شود.
            </p>
          )}
        </Card>
      )}

      {/* Grand total */}
      {hasSelection && (
        <div
          data-testid="step2-grand-total"
          className="border-primary-200 bg-primary-50 flex items-center justify-between rounded-lg border px-4 py-3"
        >
          <span className="text-surface-900 font-bold">جمع کل قابل پرداخت</span>
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-primary-700 text-lg font-bold">
              {formatPrice(grandTotal)} تومان
            </span>
            <UsdTag toman={grandTotal} rate={rate} />
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="border-surface-200 flex justify-between border-t pt-2">
        <Button variant="outline" onClick={onBack}>
          بازگشت
        </Button>
        <Button
          variant="primary"
          onClick={() => onComplete(selectedServices)}
          disabled={selectedServices.length === 0}
          className="min-w-[160px]"
        >
          ادامه به پرداخت
        </Button>
      </div>
    </div>
  );
}

/**
 * Per-service billable consumable recipe (ServiceItem rows).
 * Prefills backend recipe quantities + customer unit prices (product.unit_price);
 * edits flow into the patient total and into record-consumption at checkout.
 */
function ServiceConsumablesBlock({
  serviceId,
  serviceName,
  selection,
  onUserChange,
}: {
  serviceId: number;
  serviceName: string;
  selection: ConsumableSelection[];
  onUserChange: (rows: ConsumableSelection[]) => void;
}) {
  const { data: recipe, isLoading: recipeLoading } = useServiceItems(serviceId);
  const { data: productsData, isLoading: productsLoading } = useAllProducts();
  const [initialized, setInitialized] = useState(false);

  const productMap = useMemo(() => {
    const map = new Map<number, WarehouseItem>();
    for (const p of productsData ?? []) map.set(p.id, p);
    return map;
  }, [productsData]);

  useEffect(() => {
    if (initialized || recipeLoading || productsLoading) return;
    if (!recipe || recipe.length === 0 || selection.length > 0) return;
    // One-time sync of server recipe defaults into parent form state (totals + checkout payload).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialized(true);
    onUserChange(
      recipe.map((r) => {
        const product = productMap.get(r.product);
        if (product) return productToConsumable(product, r.quantity);
        return {
          product: r.product,
          productName: r.productName || `محصول ${r.product}`,
          quantity: r.quantity,
          priceToman: "0",
          priceUsd: "0",
        };
      })
    );
  }, [
    initialized,
    recipeLoading,
    productsLoading,
    recipe,
    selection.length,
    productMap,
    onUserChange,
  ]);

  if (recipeLoading || productsLoading) {
    return (
      <div className="border-surface-200 bg-surface-50 rounded-lg border p-3">
        <p className="text-surface-400 text-xs">در حال بارگذاری مواد مصرفی {serviceName}...</p>
      </div>
    );
  }

  if (!recipe || recipe.length === 0) return null;

  const recipeFallback = recipe.map((r) => {
    const product = productMap.get(r.product);
    return product
      ? productToConsumable(product, r.quantity)
      : {
          product: r.product,
          productName: r.productName || `محصول ${r.product}`,
          quantity: r.quantity,
          priceToman: "0",
          priceUsd: "0",
        };
  });
  const rows = selection.length > 0 || initialized ? selection : recipeFallback;

  return (
    <ConsumableRowsCard
      title={serviceName}
      rows={rows}
      serviceId={serviceId}
      selection={selection}
      recipe={recipe}
      productMap={productMap}
      onChange={(next) => {
        setInitialized(true);
        onUserChange(next);
      }}
    />
  );
}

/** Package billable products (PackageItem rows) — same customer pricing as service recipes. */
function PackageConsumablesBlock({
  packageId,
  packageName,
  selection,
  onUserChange,
}: {
  packageId: number;
  packageName: string;
  selection: ConsumableSelection[];
  onUserChange: (rows: ConsumableSelection[]) => void;
}) {
  const { data: pkg, isLoading: pkgLoading } = usePackage(packageId);
  const { data: productsData, isLoading: productsLoading } = useAllProducts();
  const [initialized, setInitialized] = useState(false);

  const productMap = useMemo(() => {
    const map = new Map<number, WarehouseItem>();
    for (const p of productsData ?? []) map.set(p.id, p);
    return map;
  }, [productsData]);

  const packageItems = useMemo(
    () =>
      (pkg?.items ?? []).map((item) => ({
        product: item.product,
        quantity: item.quantity,
        productName: "",
      })),
    [pkg?.items]
  );

  useEffect(() => {
    if (initialized || pkgLoading || productsLoading) return;
    if (!pkg || packageItems.length === 0 || selection.length > 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialized(true);
    onUserChange(
      packageItems.map((item) => {
        const product = productMap.get(item.product);
        if (product) return productToConsumable(product, item.quantity);
        return {
          product: item.product,
          productName: `محصول ${item.product}`,
          quantity: item.quantity,
          priceToman: "0",
          priceUsd: "0",
        };
      })
    );
  }, [
    initialized,
    pkgLoading,
    productsLoading,
    pkg,
    packageItems,
    selection.length,
    productMap,
    onUserChange,
  ]);

  if (pkgLoading || productsLoading) {
    return (
      <div className="border-surface-200 bg-surface-50 rounded-lg border p-3">
        <p className="text-surface-400 text-xs">در حال بارگذاری اقلام پکیج {packageName}...</p>
      </div>
    );
  }

  if (packageItems.length === 0) return null;

  const recipeFallback = packageItems.map((item) => {
    const product = productMap.get(item.product);
    return product
      ? productToConsumable(product, item.quantity)
      : {
          product: item.product,
          productName: `محصول ${item.product}`,
          quantity: item.quantity,
          priceToman: "0",
          priceUsd: "0",
        };
  });
  const rows = selection.length > 0 || initialized ? selection : recipeFallback;

  return (
    <ConsumableRowsCard
      title={packageName}
      rows={rows}
      serviceId={packageId}
      selection={selection}
      recipe={packageItems}
      productMap={productMap}
      onChange={(next) => {
        setInitialized(true);
        onUserChange(next);
      }}
      isPackage
    />
  );
}

/** Shared row editor for service-recipe and package consumable lists. */
function ConsumableRowsCard({
  title,
  rows,
  serviceId,
  selection,
  recipe,
  productMap,
  onChange,
  isPackage = false,
}: {
  title: string;
  rows: ConsumableSelection[];
  serviceId: number;
  selection: ConsumableSelection[];
  recipe: { product: number; quantity: string; productName?: string }[];
  productMap: Map<number, WarehouseItem>;
  onChange: (rows: ConsumableSelection[]) => void;
  isPackage?: boolean;
}) {
  const blockTotal = rows.reduce((sum, row) => sum + consumableLineToman(row), 0);
  const rate = useRateValue();

  const ensureBase = () =>
    selection.length > 0 || rows.length > 0
      ? rows.length > 0
        ? rows
        : selection
      : recipe.map((r) => {
          const product = productMap.get(r.product);
          return product
            ? productToConsumable(product, r.quantity)
            : {
                product: r.product,
                productName: r.productName || `محصول ${r.product}`,
                quantity: r.quantity,
                priceToman: "0",
                priceUsd: "0",
              };
        });

  return (
    <div className="border-surface-200 bg-surface-50 space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-surface-700 flex items-center gap-1.5 text-sm font-medium">
          {isPackage && <PiPackageBold className="text-info-600 size-3.5" />}
          {title}
        </p>
        <span className="flex flex-col items-end gap-0.5">
          <span className="text-surface-600 text-xs font-medium">
            {formatPrice(blockTotal)} تومان
          </span>
          <UsdTag toman={blockTotal} rate={rate} />
        </span>
      </div>
      {rows.length === 0 && (
        <p className="text-surface-500 py-1 text-xs">هیچ قلمی اضافه نشده است.</p>
      )}
      {rows.map((row) => {
        const unit = parseTomanAmount(row.priceToman);
        const lineTotal = consumableLineToman(row);
        const qtyNum = Number(toLatinDigits(row.quantity));
        const qtyInvalid = row.quantity.trim() !== "" && (!Number.isFinite(qtyNum) || qtyNum <= 0);
        return (
          <div
            key={row.product}
            className="border-surface-200 rounded-md border bg-white px-2 py-1.5 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-surface-700 flex-1 truncate font-medium">
                {row.productName || `محصول ${row.product}`}
              </span>
              <span className="text-surface-500 whitespace-nowrap">
                واحد: {formatPrice(unit)} تومان
                <UsdTag toman={unit} rate={rate} variant="inline" />
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <label
                  className="text-surface-400 text-[11px]"
                  htmlFor={`qty-${serviceId}-${row.product}`}
                >
                  تعداد
                </label>
                <Input
                  id={`qty-${serviceId}-${row.product}`}
                  value={row.quantity}
                  inputMode="decimal"
                  containerClassName="w-20"
                  aria-invalid={qtyInvalid || undefined}
                  onChange={(e) => {
                    const base = ensureBase();
                    onChange(
                      base.map((r) =>
                        r.product === row.product ? { ...r, quantity: e.target.value } : r
                      )
                    );
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex flex-col items-end">
                  <span className="text-surface-800 font-medium whitespace-nowrap">
                    جمع: {formatPrice(lineTotal)} تومان
                  </span>
                  <UsdTag toman={lineTotal} rate={rate} />
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const base = ensureBase();
                    onChange(base.filter((r) => r.product !== row.product));
                  }}
                  className="text-danger-500 hover:text-danger-700 hover:bg-danger-50 rounded p-1 transition-colors"
                  aria-label={`حذف ${row.productName || `محصول ${row.product}`}`}
                >
                  <BiTrash className="size-4" />
                </button>
              </div>
            </div>
            {qtyInvalid && (
              <p className="text-danger-600 mt-1 text-[11px]">تعداد باید بزرگ‌تر از صفر باشد</p>
            )}
          </div>
        );
      })}
      {recipe.some((r) => (r as unknown as { selectionGroup?: string | null }).selectionGroup) && (
        <Alert variant="info">
          این خدمت گروه انتخابی دارد — دقیقاً یک قلم از هر گروه انتخاب می‌شود.
        </Alert>
      )}
    </div>
  );
}
