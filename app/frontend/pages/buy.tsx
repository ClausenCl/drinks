import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { useMe } from "../components/useMe";

export default function BuyPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [fridges, setFridges] = useState<{ id: string; name: string }[]>([]);

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
    <AppShell title="Buy Drinks">
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Choose fridge</div>
          <div className="mt-1 text-xs text-neutral-600">This route is buy-only. Tap your fridge and enter drinks.</div>
        </div>

        {fridges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
            No active fridges found.
          </div>
        ) : (
          <div className="space-y-2">
            {fridges.map((fridge) => (
              <Link
                key={fridge.id}
                href={`/fridge/${fridge.id}`}
                className="block w-full rounded-xl border border-neutral-200 bg-white px-4 py-4 text-left text-base font-semibold shadow-sm transition hover:bg-neutral-50 active:scale-[0.99]"
              >
                {fridge.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
