import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/AppShell";
import { AdminFridgeCrud } from "../../components/AdminFridgeCrud";
import { FridgeManager } from "../../components/FridgeManager";
import { OpsDomainTabs } from "../../components/OpsDomainNav";
import { useMe } from "../../components/useMe";

export default function AdminFridgesPage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "ADMIN") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/manager");
  }, [loading, me, router]);

  return (
    <AppShell title="Admin · Fridges">
      <div className="space-y-4">
        <OpsDomainTabs basePath="/admin" active="fridges" />
        <AdminFridgeCrud />
        <FridgeManager />
      </div>
    </AppShell>
  );
}
