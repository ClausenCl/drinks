import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { AdminLogsTable } from "../components/AdminLogsTable";
import { FridgeManager } from "../components/FridgeManager";
import { ManualChargeCreator } from "../components/ManualChargeCreator";
import { BillingRuns } from "../components/BillingRuns";
import { useMe } from "../components/useMe";

export default function AdminPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "ADMIN") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/manager");
  }, [loading, me, router]);
  return (
    <AppShell title="Admin">
      <div className="space-y-4">
        <AdminLogsTable />
        <FridgeManager />
        <ManualChargeCreator />
        <BillingRuns />
      </div>
    </AppShell>
  );
}
