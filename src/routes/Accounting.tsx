import { useState } from "react";
import { CiMoneyBill, CiReceipt } from "react-icons/ci";

import { OperatingExpensesTab } from "../components/accounting/OperatingExpensesTab";
import { PayoutsTab } from "../components/accounting/PayoutsTab";
import { SalesTab } from "../components/accounting/SalesTab";
import { SearchButton } from "../components/SearchButton";
import { TabPanel, Tabs } from "../components/ui/Tabs";

function Accounting() {
  const [activeTab, setActiveTab] = useState("sales");

  return (
    <div className="flex flex-col gap-6">
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
        tabs={[
          { id: "sales", label: "فروش", icon: <CiReceipt className="size-4" /> },
          {
            id: "operating-expenses",
            label: "هزینه‌های جاری",
            icon: <CiMoneyBill className="size-4" />,
          },
          { id: "payouts", label: "تسویه پرسنل", icon: <CiMoneyBill className="size-4" /> },
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
      <TabPanel id="payouts" activeTab={activeTab}>
        <PayoutsTab />
      </TabPanel>
    </div>
  );
}

export default Accounting;
