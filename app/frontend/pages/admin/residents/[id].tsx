import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../../components/AppShell";
import { OpsDomainTabs } from "../../../components/OpsDomainNav";
import { ResidentWorkspace } from "../../../components/ResidentWorkspace";
import { useMe } from "../../../components/useMe";

export default function AdminResidentDetailPage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "ADMIN") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/manager");
  }, [loading, me, router]);

  return (
    <AppShell title="Admin · Resident">
      <div className="space-y-4">
        <OpsDomainTabs basePath="/admin" active="residents" />
        <ResidentWorkspace basePath="/admin" />
      </div>
    </AppShell>
  );
}
