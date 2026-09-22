import { useCallback, useState } from "react";
import { BiSearch } from "react-icons/bi";
import { MdDelete } from "react-icons/md";

import { usePackagesList } from "../../hooks/api/usePackagesQuery";
import { useServicesList } from "../../hooks/api/useServicesQuery";
import { toPersianDigits } from "../../lib/digits";
import type { PatientData, ServiceSelection } from "../../types/wizard";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface Props {
  patient: PatientData;
  selectedServices: ServiceSelection[];
  onBack: () => void;
  onUpdateServices: (services: ServiceSelection[]) => void;
  onComplete: (services: ServiceSelection[]) => void;
}

export default function WizardStepService({
  patient,
  selectedServices,
  onBack,
  onUpdateServices,
  onComplete,
}: Props) {
  const [tab, setTab] = useState<"services" | "packages">("services");
  const [query, setQuery] = useState("");

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

  const addService = useCallback(
    (svc: {
      id: number;
      name: string;
      priceToman: string;
      priceUsd: string;
      isPackage?: boolean;
      packageId?: number | null;
    }) => {
      const exists = selectedServices.some((s) => s.serviceId === svc.id);
      if (exists) return;
      onUpdateServices([
        ...selectedServices,
        {
          serviceId: svc.id,
          serviceName: svc.name,
          priceToman: svc.priceToman,
          priceUsd: svc.priceUsd,
          isPackage: svc.isPackage ?? false,
          packageId: svc.packageId ?? null,
        },
      ]);
    },
    [selectedServices, onUpdateServices]
  );

  const removeService = useCallback(
    (idx: number) => {
      onUpdateServices(selectedServices.filter((_, i) => i !== idx));
    },
    [selectedServices, onUpdateServices]
  );

  const totalToman = selectedServices.reduce((sum, s) => {
    const price = parseInt(s.priceToman.replace(/[^\d]/g, ""), 10) || 0;
    return sum + price;
  }, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-surface-900 text-lg font-bold">انتخاب خدمت یا پکیج</h2>
      <p className="text-surface-500 text-sm">
        بیمار: {patient.firstName} {patient.lastName}
      </p>

      <div className="flex gap-2">
        <Button
          variant={tab === "services" ? "primary" : "outline"}
          size="sm"
          onClick={() => setTab("services")}
        >
          خدمات
        </Button>
        <Button
          variant={tab === "packages" ? "primary" : "outline"}
          size="sm"
          onClick={() => setTab("packages")}
        >
          پکیج‌ها
        </Button>
      </div>

      <Input
        placeholder="جستجو..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        endIcon={<BiSearch className="text-surface-400 size-4" />}
      />

      <div className="max-h-60 space-y-1 overflow-y-auto">
        {tab === "services" &&
          services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                addService({
                  id: s.id,
                  name: s.title,
                  priceToman: String(s.priceToman ?? "0"),
                  priceUsd: String(s.priceUsd ?? "0"),
                })
              }
              className="border-surface-200 hover:border-primary-300 hover:bg-primary-50 flex w-full items-center justify-between rounded-md border px-3 py-2 text-right transition-colors"
            >
              <span className="text-surface-800 text-sm">{s.title}</span>
              <span className="text-primary-600 text-sm font-medium">
                {toPersianDigits(String(s.priceToman ?? "0"))} تومان
              </span>
            </button>
          ))}
        {tab === "packages" &&
          packages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                addService({
                  id: p.id,
                  name: p.name,
                  priceToman: p.priceToman ?? "0",
                  priceUsd: p.priceUsd,
                  isPackage: true,
                  packageId: p.id,
                })
              }
              className="border-surface-200 hover:border-primary-300 hover:bg-primary-50 flex w-full items-center justify-between rounded-md border px-3 py-2 text-right transition-colors"
            >
              <div>
                <span className="text-surface-800 text-sm">{p.name}</span>
                {p.description && (
                  <span className="text-surface-400 me-2 text-xs">{p.description}</span>
                )}
              </div>
              <span className="text-primary-600 text-sm font-medium">
                {toPersianDigits(p.priceToman ?? "0")} تومان
              </span>
            </button>
          ))}
      </div>

      {selectedServices.length > 0 && (
        <div className="border-surface-200 bg-surface-50 space-y-2 rounded-lg border p-3">
          <h3 className="text-surface-700 text-sm font-medium">انتخاب شده:</h3>
          {selectedServices.map((s, i) => (
            <div key={`${s.serviceId}-${i}`} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={s.isPackage ? "info" : "default"} size="sm">
                  {s.isPackage ? "پکیج" : "خدمت"}
                </Badge>
                <span className="text-surface-800 text-sm">{s.serviceName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-surface-600 text-xs">
                  {toPersianDigits(s.priceToman)} تومان
                </span>
                <button
                  type="button"
                  onClick={() => removeService(i)}
                  className="text-danger-500 hover:text-danger-700"
                >
                  <MdDelete className="size-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="border-surface-200 border-t pt-2 text-left">
            <span className="text-surface-900 font-bold">
              جمع: {toPersianDigits(String(totalToman))} تومان
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          بازگشت
        </Button>
        <Button
          variant="primary"
          onClick={() => onComplete(selectedServices)}
          disabled={selectedServices.length === 0}
        >
          ادامه به پرداخت
        </Button>
      </div>
    </div>
  );
}
