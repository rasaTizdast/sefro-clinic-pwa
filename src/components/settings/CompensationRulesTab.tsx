import { useState } from "react";
import { BiPencil, BiPlus, BiTrash } from "react-icons/bi";

import {
  useAllProducts,
  useCompensationRules,
  useCurrentRate,
  useUpsertCompensationRule,
} from "../../hooks/api";
import { toPersianDigits } from "../../lib/digits";
import type { StaffCompensationRule } from "../../types/finance";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { type Column, Table } from "../ui/Table";

const roleOptions = [
  { value: "doctor", label: "پزشک" },
  { value: "facial", label: "فیشال" },
  { value: "laser", label: "لیزر" },
];

const payoutTypeOptions = [
  { value: "cash", label: "نقدی" },
  { value: "product", label: "محصول" },
  { value: "hybrid", label: "ترکیبی" },
];

const calculationTypeOptions = [
  { value: "percent_profit", label: "درصد سود" },
  { value: "fixed_per_session", label: "مبلغ ثابت هر ویزیت" },
  { value: "monthly_salary", label: "حقوق ماهانه" },
];

const roleBadgeVariant: Record<string, "success" | "info" | "warning"> = {
  doctor: "info",
  facial: "warning",
  laser: "success",
};

const roleLabel: Record<string, string> = {
  doctor: "پزشک",
  facial: "فیشال",
  laser: "لیزر",
};

interface ProductRow {
  product: string;
  qty: string;
}

interface RuleForm {
  role: string;
  payoutType: string;
  calculationType: string;
  percentProfit: string;
  fixedAmountToman: string;
  fixedAmountUsd: string;
  monthlySalaryToman: string;
  monthlySalaryUsd: string;
  transportToman: string;
  products: ProductRow[];
}

const emptyForm: RuleForm = {
  role: "doctor",
  payoutType: "cash",
  calculationType: "percent_profit",
  percentProfit: "",
  fixedAmountToman: "",
  fixedAmountUsd: "",
  monthlySalaryToman: "",
  monthlySalaryUsd: "",
  transportToman: "",
  products: [],
};

export function CompensationRulesTab() {
  const { data: rules, isLoading } = useCompensationRules();
  const upsertRule = useUpsertCompensationRule();
  const { data: productsData } = useAllProducts();
  const { data: currentRate } = useCurrentRate();
  const products = productsData ?? [];
  const rate = currentRate ? Number(currentRate.rateTomanPerUsd) : 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);

  const ruleList = rules?.data ?? [];

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(rule: StaffCompensationRule) {
    setEditingId(rule.id);
    setForm({
      role: rule.role,
      payoutType: rule.payoutType,
      calculationType: rule.calculationType,
      percentProfit: rule.percentProfit ?? "",
      fixedAmountToman: rule.fixedAmountToman ?? "",
      fixedAmountUsd: rule.fixedAmountUsd ?? "",
      monthlySalaryToman: rule.fixedAmountToman ?? "",
      monthlySalaryUsd: rule.fixedAmountUsd ?? "",
      transportToman: rule.transportToman,
      products: rule.product ? [{ product: String(rule.product), qty: rule.productQty }] : [],
    });
    setModalOpen(true);
  }

  function addProductRow() {
    setForm((f) => ({ ...f, products: [...f.products, { product: "", qty: "1" }] }));
  }

  function removeProductRow(index: number) {
    setForm((f) => ({ ...f, products: f.products.filter((_, i) => i !== index) }));
  }

  function updateProductRow(index: number, field: keyof ProductRow, value: string) {
    setForm((f) => ({
      ...f,
      products: f.products.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  }

  async function handleSave() {
    const payload: Record<string, unknown> = {
      role: form.role,
      payout_type: form.payoutType,
      calculation_type: form.calculationType,
      transport_toman: Number(form.transportToman) || 0,
    };

    if (form.calculationType === "percent_profit") {
      payload.percent_profit = form.percentProfit || "0";
    } else if (form.calculationType === "fixed_per_session") {
      payload.fixed_amount_toman = form.fixedAmountToman || "0";
      if (form.fixedAmountUsd) payload.fixed_amount_usd = form.fixedAmountUsd;
    } else if (form.calculationType === "monthly_salary") {
      payload.fixed_amount_toman = form.monthlySalaryToman || "0";
      if (form.monthlySalaryUsd) payload.fixed_amount_usd = form.monthlySalaryUsd;
    }

    const activeProducts = form.products.filter((p) => p.product);
    if (form.payoutType !== "cash" && activeProducts.length > 0) {
      payload.product = Number(activeProducts[0].product);
      payload.product_qty = activeProducts[0].qty || "1";
    }

    await upsertRule.mutateAsync({
      id: editingId ?? undefined,
      payload: payload as never,
    });
    setModalOpen(false);
  }

  const columns: Column<StaffCompensationRule>[] = [
    {
      key: "role",
      header: "نقش",
      align: "center",
      render: (rule) => (
        <Badge variant={roleBadgeVariant[rule.role] ?? "info"} size="sm">
          {roleLabel[rule.role] ?? rule.role}
        </Badge>
      ),
    },
    {
      key: "payoutType",
      header: "نوع پرداخت",
      align: "center",
      render: (rule) => (
        <span className="text-surface-700 text-sm">
          {payoutTypeOptions.find((o) => o.value === rule.payoutType)?.label ?? rule.payoutType}
        </span>
      ),
    },
    {
      key: "calculationType",
      header: "نوع محاسبه",
      align: "center",
      render: (rule) => (
        <span className="text-surface-700 text-sm">
          {calculationTypeOptions.find((o) => o.value === rule.calculationType)?.label ??
            rule.calculationType}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "وضعیت",
      align: "center",
      render: (rule) => (
        <Badge variant={rule.isActive ? "success" : "danger"} size="sm">
          {rule.isActive ? "فعال" : "غیرفعال"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "عملیات",
      align: "center",
      render: (rule) => (
        <Button
          variant="ghost"
          size="sm"
          startIcon={<BiPencil className="size-4" />}
          onClick={() => openEdit(rule)}
        />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton width="100%" height="3rem" variant="rectangular" />
        <Skeleton width="100%" height="3rem" variant="rectangular" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-surface-900 text-sm font-semibold">قوانین تسویه پرسنل</h3>
        <Button variant="primary" startIcon={<BiPlus className="size-4" />} onClick={openNew}>
          قانون جدید
        </Button>
      </div>

      <Card variant="outlined" padding="none">
        <Table columns={columns} data={ruleList} rowKey={(r) => r.id} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "ویرایش قانون" : "قانون جدید"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={upsertRule.isPending}>
              ذخیره
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="نقش"
              options={roleOptions}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
            <Select
              label="نوع پرداخت"
              options={payoutTypeOptions}
              value={form.payoutType}
              onChange={(e) => setForm((f) => ({ ...f, payoutType: e.target.value }))}
            />
          </div>
          <Select
            label="نوع محاسبه"
            options={calculationTypeOptions}
            value={form.calculationType}
            onChange={(e) => setForm((f) => ({ ...f, calculationType: e.target.value }))}
          />

          {form.calculationType === "percent_profit" && (
            <Input
              label="درصد سود (%)"
              type="text"
              inputMode="numeric"
              value={form.percentProfit}
              onChange={(e) => setForm((f) => ({ ...f, percentProfit: e.target.value }))}
              placeholder="مثال: ۳۰"
            />
          )}

          {form.calculationType === "fixed_per_session" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="مبلغ ثابت (تومان)"
                type="text"
                inputMode="numeric"
                value={form.fixedAmountToman}
                onChange={(e) => setForm((f) => ({ ...f, fixedAmountToman: e.target.value }))}
                placeholder="مثال: ۵۰۰٬۰۰۰"
              />
              <Input
                label="مبلغ ثابت (دلار)"
                type="text"
                inputMode="numeric"
                value={form.fixedAmountUsd}
                onChange={(e) => setForm((f) => ({ ...f, fixedAmountUsd: e.target.value }))}
                placeholder="مثال: ۱۰"
              />
            </div>
          )}

          {form.calculationType === "monthly_salary" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="حقوق ماهانه (تومان)"
                type="text"
                inputMode="numeric"
                value={form.monthlySalaryToman}
                onChange={(e) => setForm((f) => ({ ...f, monthlySalaryToman: e.target.value }))}
                placeholder="مثال: ۵٬۰۰۰٬۰۰۰"
              />
              <Input
                label="حقوق ماهانه (دلار)"
                type="text"
                inputMode="numeric"
                value={form.monthlySalaryUsd}
                onChange={(e) => setForm((f) => ({ ...f, monthlySalaryUsd: e.target.value }))}
                placeholder="مثال: ۱۰۰"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-surface-700 text-sm font-medium">ایاب و ذهاب (تومان)</label>
            <Input
              type="text"
              inputMode="numeric"
              value={form.transportToman}
              onChange={(e) => setForm((f) => ({ ...f, transportToman: e.target.value }))}
              placeholder="۰"
            />
            {rate > 0 && form.transportToman && (
              <span className="text-surface-400 text-xs">
                ≈ {toPersianDigits((Number(form.transportToman) / rate).toFixed(2))} دلار
              </span>
            )}
          </div>

          {form.payoutType !== "cash" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-surface-700 text-sm font-medium">محصولات</label>
                <Button
                  variant="outline"
                  size="sm"
                  startIcon={<BiPlus className="size-4" />}
                  onClick={addProductRow}
                >
                  افزودن محصول
                </Button>
              </div>

              {form.products.length === 0 && (
                <p className="text-surface-400 text-sm">هنوز محصولی اضافه نشده است.</p>
              )}

              {form.products.map((row, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      label={`محصول ${toPersianDigits(String(index + 1))}`}
                      options={products.map((p) => ({ value: String(p.id), label: p.name }))}
                      placeholder="انتخاب محصول"
                      value={row.product}
                      onChange={(e) => updateProductRow(index, "product", e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      label="تعداد"
                      type="text"
                      inputMode="numeric"
                      value={row.qty}
                      onChange={(e) => updateProductRow(index, "qty", e.target.value)}
                      placeholder="۱"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    startIcon={<BiTrash className="text-danger-500 size-4" />}
                    onClick={() => removeProductRow(index)}
                    disabled={form.products.length === 1}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
