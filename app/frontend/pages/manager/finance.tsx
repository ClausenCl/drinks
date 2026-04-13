import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/AppShell";
import { BillingRuns } from "../../components/BillingRuns";
import { BillsManagerList } from "../../components/BillsManagerList";
import { ManualChargeCreator } from "../../components/ManualChargeCreator";
import { OpsDomainTabs } from "../../components/OpsDomainNav";
import { ResidentConsumptionTable } from "../../components/ResidentConsumptionTable";
import { useMe } from "../../components/useMe";

export default function ManagerFinancePage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "GETRAENKEMINISTER") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/admin");
  }, [loading, me, router]);

  return (
    <AppShell title="Manager · Finance">
      <div className="space-y-4">
        <OpsDomainTabs basePath="/manager" active="finance" />
        <ResidentConsumptionTable />
        <BillsManagerList />
        <ManualChargeCreator />
        <BillingRuns />
      </div>
    </AppShell>
  );
}
