import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { ResidentConsumptionTable } from "../components/ResidentConsumptionTable";
import { FridgeManager } from "../components/FridgeManager";
import { ManualChargeCreator } from "../components/ManualChargeCreator";
import { useMe } from "../components/useMe";

export default function ManagerPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "GETRAENKEMINISTER") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/admin");
  }, [loading, me, router]);
  return (
    <AppShell title="Manager">
      <div className="space-y-4">
        <ResidentConsumptionTable />
        <FridgeManager />
        <ManualChargeCreator />
      </div>
    </AppShell>
  );
}
