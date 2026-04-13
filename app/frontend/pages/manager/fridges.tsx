import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/AppShell";
import { FridgeManager } from "../../components/FridgeManager";
import { OpsDomainTabs } from "../../components/OpsDomainNav";
import { useMe } from "../../components/useMe";

export default function ManagerFridgesPage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "GETRAENKEMINISTER") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/admin");
  }, [loading, me, router]);

  return (
    <AppShell title="Manager · Fridges">
      <div className="space-y-4">
        <OpsDomainTabs basePath="/manager" active="fridges" />
        <FridgeManager />
      </div>
    </AppShell>
  );
}
