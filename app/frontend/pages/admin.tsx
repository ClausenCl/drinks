import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { OpsDomainCards } from "../components/OpsDomainNav";
import { OpsQuickActions } from "../components/OpsQuickActions";
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Operations home</div>
          <p className="mt-1 text-xs text-neutral-600">Choose an area to manage residents, fridges, finance, and system settings.</p>
        </div>
        <OpsQuickActions basePath="/admin" />
        <OpsDomainCards basePath="/admin" />
      </div>
    </AppShell>
  );
}
