import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { FridgeSelector, type FridgeOption } from "../components/FridgeSelector";
import { useMe } from "../components/useMe";

export default function MenuPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [fridges, setFridges] = useState<FridgeOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "BEWOHNER") void router.replace(me.role === "ADMIN" ? "/admin" : "/manager");
  }, [loading, me, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/fridges");
      if (!res.ok) return;
      const data = (await res.json()) as { id: string; name: string }[];
      if (!cancelled) setFridges(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell title="Menu">
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-neutral-600">Logged in as</div>
          <div className="mt-1 text-base font-semibold">{me ? me.name : "..."}</div>
        </div>

        <FridgeSelector fridges={fridges} value={selected} onChange={(id) => setSelected(id)} />

        {selected ? (
          <Link className="block w-full rounded-xl bg-black px-4 py-3 text-center text-base font-semibold text-white shadow-sm" href={`/fridge/${selected}`}>
            Open fridge
          </Link>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            Select a fridge to start logging.
          </div>
        )}
      </div>
    </AppShell>
  );
}
