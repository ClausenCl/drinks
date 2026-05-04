import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { OpsDomainCards } from "../components/OpsDomainNav";
import { OpsQuickActions } from "../components/OpsQuickActions";
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Minister operations</div>
          <p className="mt-1 text-xs text-neutral-600">House-scoped control center for residents, fridges, and billing.</p>
        </div>
        <OpsQuickActions basePath="/manager" />
        <OpsDomainCards basePath="/manager" />
      </div>
    </AppShell>
  );
}
