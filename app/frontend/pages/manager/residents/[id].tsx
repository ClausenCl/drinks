import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../../components/AppShell";
import { OpsDomainTabs } from "../../../components/OpsDomainNav";
import { ResidentWorkspace } from "../../../components/ResidentWorkspace";
import { useMe } from "../../../components/useMe";

export default function ManagerResidentDetailPage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "GETRAENKEMINISTER") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/admin");
  }, [loading, me, router]);

  return (
    <AppShell title="Manager · Resident">
      <div className="space-y-4">
        <OpsDomainTabs basePath="/manager" active="residents" />
        <ResidentWorkspace basePath="/manager" />
      </div>
    </AppShell>
  );
}
