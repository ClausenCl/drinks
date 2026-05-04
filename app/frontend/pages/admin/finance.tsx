import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/AppShell";
import { AdminHistoryManager } from "../../components/AdminHistoryManager";
import { BillingRuns } from "../../components/BillingRuns";
import { BillsManagerList } from "../../components/BillsManagerList";
import { FridgeItemAnalyticsPanel } from "../../components/FridgeItemAnalyticsPanel";
import { ManualChargeCreator } from "../../components/ManualChargeCreator";
import { OpsDomainTabs } from "../../components/OpsDomainNav";
import { ResidentConsumptionTable } from "../../components/ResidentConsumptionTable";
import { useMe } from "../../components/useMe";

export default function AdminFinancePage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "ADMIN") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/manager");
  }, [loading, me, router]);

  return (
    <AppShell title="Admin · Finance">
      <div className="space-y-4">
        <OpsDomainTabs basePath="/admin" active="finance" />
        <ResidentConsumptionTable />
        <FridgeItemAnalyticsPanel />
        <BillsManagerList />
        <ManualChargeCreator />
        <BillingRuns />
        <AdminHistoryManager />
      </div>
    </AppShell>
  );
}
