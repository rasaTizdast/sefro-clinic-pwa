import { useCallback, useEffect } from "react";
import { MdClose, MdPerson } from "react-icons/md";
import { useNavigate } from "react-router";

import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import WizardStepPatient from "../components/wizard/WizardStepPatient";
import WizardStepPayment from "../components/wizard/WizardStepPayment";
import WizardStepService from "../components/wizard/WizardStepService";
import { useWizard } from "../contexts/WizardContext";
import type {
  ConsumableSelection,
  ServiceSelection,
  WizardStep,
  WizardTabData,
} from "../types/wizard";

function WizardPage() {
  const { tabs, activeTabId, createTab, closeTab, setActiveTabId, updateTab } = useWizard();
  const { success: toastSuccess } = useToast();
  const navigate = useNavigate();
  const activeTab = activeTabId ? (tabs.find((t) => t.id === activeTabId) ?? null) : null;

  const handleUpdateTab = useCallback(
    (updates: Partial<WizardTabData>) => {
      if (!activeTabId) return;
      updateTab(activeTabId, updates);
    },
    [activeTabId, updateTab]
  );

  useEffect(() => {
    if (activeTabId && !tabs.find((t) => t.id === activeTabId)) {
      setActiveTabId(tabs.length > 0 ? tabs[tabs.length - 1].id : null);
    }
  }, [activeTabId, tabs, setActiveTabId]);

  const handleStepComplete = useCallback(
    (step: WizardStep, data: Partial<WizardTabData>) => {
      if (!activeTabId) return;
      const nextStep: Record<WizardStep, WizardStep | null> = {
        patient: "service",
        service: "payment",
        payment: null,
      };
      const updates: Partial<WizardTabData> = { ...data };
      if (!updates.step && nextStep[step]) {
        updates.step = nextStep[step];
      }
      updateTab(activeTabId, updates);
      if (step === "payment") {
        toastSuccess("پذیرش با موفقیت ثبت شد");
        closeTab(activeTabId);
        setActiveTabId(null);
        navigate("/");
      }
    },
    [activeTabId, updateTab, toastSuccess, closeTab, setActiveTabId, navigate]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-surface-200 flex items-center gap-3 border-b px-4 py-3">
        <MdPerson className="text-primary-600 size-5" />
        <span className="text-surface-800 font-bold">پذیرش بیمار</span>
        <div className="me-auto flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeTabId === tab.id
                  ? "bg-primary-600 text-white"
                  : "bg-surface-100 text-surface-700 hover:bg-surface-200"
              }`}
            >
              {tab.patient.firstName || "بیمار جدید"}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }
                }}
                className="ms-1 cursor-pointer rounded-full p-0.5 hover:bg-white/20"
              >
                <MdClose className="size-3" />
              </span>
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => createTab()}>
            <span className="text-lg leading-none">+</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab ? (
          <WizardStepContent
            tab={activeTab}
            onComplete={handleStepComplete}
            onUpdateTab={handleUpdateTab}
            onBack={() => {
              if (!activeTabId) return;
              const stepOrder: WizardStep[] = ["patient", "service", "payment"];
              const currentIdx = stepOrder.indexOf(activeTab.step ?? "patient");
              if (currentIdx > 0) {
                updateTab(activeTabId, { step: stepOrder[currentIdx - 1] });
              }
            }}
          />
        ) : (
          <div className="text-surface-400 flex h-full flex-col items-center justify-center gap-4">
            <MdPerson className="size-16 opacity-30" />
            <p className="text-lg">برای شروع پذیرش، دکمه + را بزنید</p>
            <Button variant="primary" onClick={() => createTab()}>
              پذیرش جدید
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function WizardStepContent({
  tab,
  onComplete,
  onUpdateTab,
  onBack,
}: {
  tab: WizardTabData;
  onComplete: (step: WizardStep, data: Partial<WizardTabData>) => void;
  onUpdateTab: (updates: Partial<WizardTabData>) => void;
  onBack: () => void;
}) {
  const { step } = tab;

  // Stable identities so child effects that depend on update callbacks
  // (recipe consumable seeding) do not re-run / clobber sibling keys every render.
  const handleUpdateConsumables = useCallback(
    (consumables: Record<string, ConsumableSelection[]>) => onUpdateTab({ consumables }),
    [onUpdateTab]
  );
  const handleUpdateExtraProducts = useCallback(
    (extraProducts: ConsumableSelection[]) => onUpdateTab({ extraProducts }),
    [onUpdateTab]
  );
  const handleUpdateServices = useCallback(
    (services: ServiceSelection[]) =>
      onUpdateTab({
        selectedServices: services,
        selectedPackageId: services.find((s) => s.isPackage)?.packageId ?? null,
      }),
    [onUpdateTab]
  );
  const handleServiceComplete = useCallback(
    (services: ServiceSelection[]) =>
      onComplete("service", {
        selectedServices: services,
        selectedPackageId: services.find((s) => s.isPackage)?.packageId ?? null,
        step: "payment",
      }),
    [onComplete]
  );

  const steps: { key: WizardStep; label: string }[] = [
    { key: "patient", label: "بیمار" },
    { key: "service", label: "خدمت" },
    { key: "payment", label: "پرداخت" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                i < currentIdx
                  ? "bg-success-600 text-white"
                  : i === currentIdx
                    ? "bg-primary-600 text-white"
                    : "bg-surface-200 text-surface-500"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm ${i === currentIdx ? "text-surface-900 font-medium" : "text-surface-400"}`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-surface-300 mx-1">-</span>}
          </div>
        ))}
      </div>

      {step === "patient" && (
        <WizardStepPatient
          patient={tab.patient}
          onBack={onBack}
          onComplete={(patient) => onComplete("patient", { patient, step: "service" })}
        />
      )}
      {step === "service" && (
        <WizardStepService
          patient={tab.patient}
          selectedServices={tab.selectedServices}
          consumables={tab.consumables ?? {}}
          extraProducts={tab.extraProducts ?? []}
          onBack={() => onComplete("patient", { step: "patient" })}
          onUpdateServices={handleUpdateServices}
          onUpdateConsumables={handleUpdateConsumables}
          onUpdateExtraProducts={handleUpdateExtraProducts}
          onComplete={handleServiceComplete}
        />
      )}
      {step === "payment" && (
        <WizardStepPayment
          patient={tab.patient}
          selectedServices={tab.selectedServices}
          consumables={tab.consumables ?? {}}
          extraProducts={tab.extraProducts ?? []}
          welcomePack={tab.welcomePack}
          onSelectWelcomePack={(welcomePack) => onUpdateTab({ welcomePack })}
          onBack={() => onComplete("service", { step: "service" })}
          onComplete={(payment) => onComplete("payment", { payment })}
          onUpdatePatient={(patient) => onUpdateTab({ patient })}
        />
      )}
    </div>
  );
}

export default WizardPage;
