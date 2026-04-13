import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/AppShell";
import { OpsDomainTabs } from "../../components/OpsDomainNav";
import { ResidentDirectory } from "../../components/ResidentDirectory";
import { useMe } from "../../components/useMe";

export default function AdminResidentsPage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "ADMIN") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/manager");
  }, [loading, me, router]);

  return (
    <AppShell title="Admin · Residents">
      <div className="space-y-4">
        <OpsDomainTabs basePath="/admin" active="residents" />
        <ResidentDirectory basePath="/admin" />
      </div>
    </AppShell>
  );
}
