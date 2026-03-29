import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { AdminLogsTable } from "../components/AdminLogsTable";
import { AdminFridgeCrud } from "../components/AdminFridgeCrud";
import { FridgeManager } from "../components/FridgeManager";
import { ManualChargeCreator } from "../components/ManualChargeCreator";
import { BillingRuns } from "../components/BillingRuns";
import { BillsManagerList } from "../components/BillsManagerList";
import { AdminHistoryManager } from "../components/AdminHistoryManager";
import { AdminProductsManager } from "../components/AdminProductsManager";
import { AdminUsersPanel } from "../components/AdminUsersPanel";
import { AdminAuditLogsPanel } from "../components/AdminAuditLogsPanel";
import { useMe } from "../components/useMe";

export default function AdminPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const sections = [
    { id: "users", label: "Users" },
    { id: "history", label: "History" },
    { id: "products", label: "Products" },
    { id: "logs", label: "Audit" },
    { id: "houses", label: "Houses" },
    { id: "fridges", label: "Fridges" },
    { id: "billing", label: "Billing" },
  ];

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "ADMIN") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/manager");
  }, [loading, me, router]);

  return (
    <AppShell title="Admin">
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="mb-2 text-xs font-medium text-neutral-600">Jump to</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-800">
                {section.label}
              </a>
            ))}
          </div>
        </div>

        <section id="users" className="scroll-mt-28">
          <AdminUsersPanel />
        </section>
        <section id="history" className="scroll-mt-28">
          <AdminHistoryManager />
        </section>
        <section id="products" className="scroll-mt-28">
          <AdminProductsManager />
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
