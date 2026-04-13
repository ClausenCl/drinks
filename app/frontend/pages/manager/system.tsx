import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/AppShell";
import { OpsDomainTabs } from "../../components/OpsDomainNav";
import { useMe } from "../../components/useMe";

type Fridge = { id: string; name: string };

export default function ManagerSystemPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [fridges, setFridges] = useState<Fridge[]>([]);

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "GETRAENKEMINISTER") void router.replace(me.role === "BEWOHNER" ? "/menu" : "/admin");
  }, [loading, me, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/manage/fridges");
      if (!res.ok) return;
      const data = (await res.json()) as Fridge[];
      if (!cancelled) setFridges(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell title="Manager · System">
      <div className="space-y-4">
        <OpsDomainTabs basePath="/manager" active="system" />
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">House scope</div>
          <p className="mt-1 text-xs text-neutral-600">This account is limited to your own house and assigned fridges.</p>
          <div className="mt-3 text-xs text-neutral-700">House: {me?.houseName ?? "—"}</div>
          <div className="mt-2 text-xs text-neutral-700">Allowed fridges: {fridges.length}</div>
          <div className="mt-3">
            <Link href="/manager/fridges" className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50">
              Open fridge management
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
