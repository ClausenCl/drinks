import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/AppShell";
import { FridgeQrSheet } from "../../components/FridgeQrSheet";
import { OpsDomainTabs } from "../../components/OpsDomainNav";
import { useMe } from "../../components/useMe";

export default function AdminFridgesQrSheetPage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "ADMIN") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/manager");
  }, [loading, me, router]);

  return (
    <AppShell title="Admin · QR Sheet">
      <div className="space-y-4">
        <OpsDomainTabs basePath="/admin" active="fridges" />
        <FridgeQrSheet basePath="/admin" />
      </div>
    </AppShell>
  );
}
