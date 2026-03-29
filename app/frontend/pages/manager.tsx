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

export default function ManagerPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [jumpTarget, setJumpTarget] = useState("users");
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

  function jumpTo(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <AppShell title="Manager">
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
