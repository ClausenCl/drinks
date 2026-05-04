import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/AppShell";
import { FridgeQrSheet } from "../../components/FridgeQrSheet";
import { OpsDomainTabs } from "../../components/OpsDomainNav";
import { useMe } from "../../components/useMe";

export default function ManagerFridgesQrSheetPage() {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "GETRAENKEMINISTER") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/admin");
  }, [loading, me, router]);

  return (
    <AppShell title="Manager · QR Sheet">
      <div className="space-y-4">
        <OpsDomainTabs basePath="/manager" active="fridges" />
        <FridgeQrSheet basePath="/manager" />
      </div>
    </AppShell>
  );
}
