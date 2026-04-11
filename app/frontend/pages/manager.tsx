import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { ResidentConsumptionTable } from "../components/ResidentConsumptionTable";
import { FridgeManager } from "../components/FridgeManager";
import { ManualChargeCreator } from "../components/ManualChargeCreator";
import { BillingRuns } from "../components/BillingRuns";
import { BillsManagerList } from "../components/BillsManagerList";
import { AdminUsersPanel } from "../components/AdminUsersPanel";
import { useMe } from "../components/useMe";

const managerTabs = [
  { id: "users", label: "Users" },
  { id: "consumption", label: "Unbilled" },
  { id: "fridges", label: "Fridges" },
  { id: "bills", label: "Bills" },
  { id: "charges", label: "Charges" },
  { id: "billing", label: "Billing" },
] as const;

type ManagerTabId = (typeof managerTabs)[number]["id"];

export default function ManagerPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ManagerTabId>("users");

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "GETRAENKEMINISTER") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/admin");
  }, [loading, me, router]);

  return (
    <AppShell title="Manager">
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="mb-2 text-xs font-medium text-neutral-600">Sections</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {managerTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "shrink-0 rounded-full px-3 py-2 text-sm font-medium",
                  activeTab === tab.id ? "bg-black text-white" : "bg-neutral-100 text-neutral-900",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "users" ? <AdminUsersPanel /> : null}
        {activeTab === "consumption" ? <ResidentConsumptionTable /> : null}
        {activeTab === "fridges" ? <FridgeManager /> : null}
        {activeTab === "bills" ? <BillsManagerList /> : null}
        {activeTab === "charges" ? <ManualChargeCreator /> : null}
        {activeTab === "billing" ? <BillingRuns /> : null}
      </div>
    </AppShell>
  );
}
