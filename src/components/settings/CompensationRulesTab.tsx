import { useState } from "react";
import { BiPencil, BiPlus } from "react-icons/bi";

import { useCompensationRules, useProductsList, useUpsertCompensationRule } from "../../hooks/api";
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

interface RuleForm {
  role: string;
  payoutType: string;
  calculationType: string;
  percentProfit: string;
  fixedAmountToman: string;
  transportToman: string;
  product: string;
  productQty: string;
}

const emptyForm: RuleForm = {
  role: "doctor",
  payoutType: "cash",
  calculationType: "percent_profit",
  percentProfit: "",
  fixedAmountToman: "",
  transportToman: "",
  product: "",
  productQty: "",
};

export function CompensationRulesTab() {
  const { data: rules, isLoading } = useCompensationRules();
  const upsertRule = useUpsertCompensationRule();
  const { data: productsData } = useProductsList({ perPage: 200 });
  const products = productsData?.data ?? [];

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
      transportToman: rule.transportToman,
      product: rule.product ? String(rule.product) : "",
      productQty: rule.productQty,
    });
    setModalOpen(true);
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
    }

    if (form.payoutType !== "cash" && form.product) {
      payload.product = Number(form.product);
      payload.product_qty = form.productQty || "1";
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
              placeholder="مثال: 30"
            />
          )}

          {form.calculationType === "fixed_per_session" && (
            <Input
              label="مبلغ ثابت (تومان)"
              type="text"
              inputMode="numeric"
              value={form.fixedAmountToman}
              onChange={(e) => setForm((f) => ({ ...f, fixedAmountToman: e.target.value }))}
              placeholder="مثال: 500000"
            />
          )}

          <Input
            label="ایاب و ذهاب (تومان)"
            type="text"
            inputMode="numeric"
            value={form.transportToman}
            onChange={(e) => setForm((f) => ({ ...f, transportToman: e.target.value }))}
            placeholder="0"
          />

          {form.payoutType !== "cash" && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="محصول"
                options={products.map((p) => ({ value: String(p.id), label: p.name }))}
                placeholder="انتخاب محصول"
                value={form.product}
                onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
              />
              <Input
                label="تعداد"
                type="text"
                inputMode="numeric"
                value={form.productQty}
                onChange={(e) => setForm((f) => ({ ...f, productQty: e.target.value }))}
                placeholder="1"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
