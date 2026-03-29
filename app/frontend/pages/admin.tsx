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

export default function AdminPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [jumpTarget, setJumpTarget] = useState("users");
  const sections = [
    { id: "users", label: "Users" },
    { id: "history", label: "History" },
    { id: "logs", label: "Audit" },
    { id: "houses", label: "Houses" },
    { id: "fridges", label: "Fridges" },
    { id: "billing", label: "Billing" },
  ];

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "ADMIN") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/manager");
  }, [loading, me, router]);

  function jumpTo(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <AppShell title="Admin">
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="mb-2 text-xs font-medium text-neutral-600">Quick navigation</div>
          <div className="flex items-center gap-2">
            <select className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" value={jumpTarget} onChange={(e) => setJumpTarget(e.target.value)}>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
            <button type="button" className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white" onClick={() => jumpTo(jumpTarget)}>
              Go
            </button>
          </div>
        </div>

        <section id="users" className="scroll-mt-28">
          <AdminUsersPanel />
        </section>
        <section id="history" className="scroll-mt-28">
          <AdminHistoryManager />
        </section>
        <section id="logs" className="scroll-mt-28">
          <AdminAuditLogsPanel />
        </section>
        <section id="houses" className="scroll-mt-28">
          <AdminLogsTable />
        </section>
        <section id="fridges" className="scroll-mt-28 space-y-4">
          <AdminFridgeCrud />
          <FridgeManager />
        </section>
        <section id="billing" className="scroll-mt-28 space-y-4">
          <BillsManagerList />
          <ManualChargeCreator />
          <BillingRuns />
        </section>
      </div>
    </AppShell>
  );
}
