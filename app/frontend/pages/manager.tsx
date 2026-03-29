import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { ResidentConsumptionTable } from "../components/ResidentConsumptionTable";
import { FridgeManager } from "../components/FridgeManager";
import { ManualChargeCreator } from "../components/ManualChargeCreator";
import { BillingRuns } from "../components/BillingRuns";
import { BillsManagerList } from "../components/BillsManagerList";
import { AdminUsersPanel } from "../components/AdminUsersPanel";
import { useMe } from "../components/useMe";

export default function ManagerPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const sections = [
    { id: "users", label: "Users" },
    { id: "consumption", label: "Unbilled" },
    { id: "fridges", label: "Fridges" },
    { id: "bills", label: "Bills" },
    { id: "charges", label: "Charges" },
    { id: "billing", label: "Billing" },
  ];

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "GETRAENKEMINISTER") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/admin");
  }, [loading, me, router]);

  return (
    <AppShell title="Manager">
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
        <section id="consumption" className="scroll-mt-28">
          <ResidentConsumptionTable />
        </section>
        <section id="fridges" className="scroll-mt-28">
          <FridgeManager />
        </section>
        <section id="bills" className="scroll-mt-28">
          <BillsManagerList />
        </section>
        <section id="charges" className="scroll-mt-28">
          <ManualChargeCreator />
        </section>
        <section id="billing" className="scroll-mt-28">
          <BillingRuns />
        </section>
      </div>
    </AppShell>
  );
}
