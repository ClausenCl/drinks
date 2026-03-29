import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { AdminLogsTable } from "../components/AdminLogsTable";
import { AdminFridgeCrud } from "../components/AdminFridgeCrud";
import { FridgeManager } from "../components/FridgeManager";
import { ManualChargeCreator } from "../components/ManualChargeCreator";
import { BillingRuns } from "../components/BillingRuns";
import { BillsManagerList } from "../components/BillsManagerList";
import { AdminHistoryManager } from "../components/AdminHistoryManager";
import { AdminUsersPanel } from "../components/AdminUsersPanel";
import { AdminAuditLogsPanel } from "../components/AdminAuditLogsPanel";
import { useMe } from "../components/useMe";

const adminTabs = [
  { id: "users", label: "Users" },
  { id: "history", label: "History" },
  { id: "audit", label: "Audit" },
  { id: "houses", label: "Houses" },
  { id: "fridges", label: "Fridges" },
  { id: "billing", label: "Billing" },
] as const;

type AdminTabId = (typeof adminTabs)[number]["id"];

export default function AdminPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTabId>("users");

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "ADMIN") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/manager");
  }, [loading, me, router]);

  return (
    <AppShell title="Admin">
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="mb-2 text-xs font-medium text-neutral-600">Sections</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {adminTabs.map((tab) => (
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
        {activeTab === "history" ? <AdminHistoryManager /> : null}
        {activeTab === "audit" ? <AdminAuditLogsPanel /> : null}
        {activeTab === "houses" ? <AdminLogsTable /> : null}
        {activeTab === "fridges" ? (
          <div className="space-y-4">
            <AdminFridgeCrud />
            <FridgeManager />
          </div>
        ) : null}
        {activeTab === "billing" ? (
          <div className="space-y-4">
            <BillsManagerList />
            <ManualChargeCreator />
            <BillingRuns />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
