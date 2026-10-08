import { useState } from "react";
import { CiMoneyBill, CiReceipt, CiSettings, CiUser, CiWallet } from "react-icons/ci";

import { OperatingExpensesTab } from "../components/accounting/OperatingExpensesTab";
import { PayoutsTab } from "../components/accounting/PayoutsTab";
import { SalesTab } from "../components/accounting/SalesTab";
import { StaffExpensesTab } from "../components/accounting/StaffExpensesTab";
import { SearchButton } from "../components/SearchButton";
import { CompensationRulesTab } from "../components/settings/CompensationRulesTab";
import { TabPanel, Tabs } from "../components/ui/Tabs";
import { useExpensesList, useOperatingExpenseSummary, usePayoutsList } from "../hooks/api";

function Accounting() {
  const [activeTab, setActiveTab] = useState("sales");
  const [personnelTab, setPersonnelTab] = useState("staff-expenses");

  // Live workload counts so the tab bar shows what still needs attention.
  const { data: expenseSummary } = useOperatingExpenseSummary({ period: "this_month" });
  const { data: pendingPayouts } = usePayoutsList({ status: "pending", perPage: 1 });
  const { data: pendingClaims } = useExpensesList({ status: "submitted", perPage: 1 });
  const pendingTotal = (pendingClaims?.total ?? 0) + (pendingPayouts?.total ?? 0);

  return (
    <div className="accounting-page flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-surface-900 text-2xl font-bold" data-tour="acc-header">
            حسابداری
          </h1>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <SearchButton />
        </div>
      </div>

      <Tabs
        ariaLabel="بخش‌های حسابداری"
        tabs={[
          { id: "sales", label: "فروش", icon: <CiReceipt className="size-4" /> },
          {
            id: "operating-expenses",
            label: "هزینه‌های جاری",
            icon: <CiMoneyBill className="size-4" />,
            badge: expenseSummary?.count || undefined,
          },
          {
            id: "personnel",
            label: "پرسنل",
            icon: <CiUser className="size-4" />,
            badge: pendingTotal || undefined,
          },
          {
            id: "compensation-rules",
            label: "قوانین تسویه",
            icon: <CiSettings className="size-4" />,
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <TabPanel id="sales" activeTab={activeTab}>
        <SalesTab />
      </TabPanel>
      <TabPanel id="operating-expenses" activeTab={activeTab}>
        <OperatingExpensesTab />
      </TabPanel>
      <TabPanel id="personnel" activeTab={activeTab}>
        <Tabs
          ariaLabel="بخش‌های پرسنل"
          tabs={[
            {
              id: "staff-expenses",
              label: "مطالبات پرسنل",
              icon: <CiWallet className="size-4" />,
              badge: pendingClaims?.total || undefined,
            },
            {
              id: "payouts",
              label: "تسویه پرسنل",
              icon: <CiUser className="size-4" />,
              badge: pendingPayouts?.total || undefined,
            },
          ]}
          activeTab={personnelTab}
          onChange={setPersonnelTab}
        />
        <TabPanel id="staff-expenses" activeTab={personnelTab} className="pt-6">
          <StaffExpensesTab />
        </TabPanel>
        <TabPanel id="payouts" activeTab={personnelTab} className="pt-6">
          <PayoutsTab />
        </TabPanel>
      </TabPanel>
      <TabPanel id="compensation-rules" activeTab={activeTab}>
        <CompensationRulesTab />
      </TabPanel>
    </div>
  );
}

export default Accounting;
