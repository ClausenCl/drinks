import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { DrinkHistoryList, type DrinkHistoryItem } from "../components/DrinkHistoryList";
import { useMe } from "../components/useMe";

type BillShare = { id: string; title: string; createdAt: string; shareAmount: string; billed: boolean };
type ManualCharge = { id: string; title: string; createdAt: string; amount: string; billed: boolean };

export default function HistoryPage() {
  const [items, setItems] = useState<DrinkHistoryItem[]>([]);
  const [billShares, setBillShares] = useState<BillShare[]>([]);
  const [charges, setCharges] = useState<ManualCharge[]>([]);
  const [tab, setTab] = useState<"unbilled" | "billed">("unbilled");
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "BEWOHNER") void router.replace(me.role === "ADMIN" ? "/admin" : "/manager");
  }, [loading, me, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [dRes, bRes, cRes] = await Promise.all([
        fetch(`/api/drinks/me?billed=${tab}`),
        fetch(`/api/bills/me?billed=${tab}`),
        fetch(`/api/manual-charges/me?billed=${tab}`),
      ]);
      if (dRes.ok) {
        const data = (await dRes.json()) as DrinkHistoryItem[];
        if (!cancelled) setItems(data);
      }
      if (bRes.ok) {
        const data = (await bRes.json()) as BillShare[];
        if (!cancelled) setBillShares(data);
      }
      if (cRes.ok) {
        const data = (await cRes.json()) as ManualCharge[];
        if (!cancelled) setCharges(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <AppShell title="History">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            className={["flex-1 rounded-xl px-4 py-3 text-sm font-semibold", tab === "unbilled" ? "bg-black text-white" : "bg-neutral-100"].join(" ")}
            onClick={() => setTab("unbilled")}
          >
            Not invoiced
          </button>
          <button
            type="button"
            className={["flex-1 rounded-xl px-4 py-3 text-sm font-semibold", tab === "billed" ? "bg-black text-white" : "bg-neutral-100"].join(" ")}
            onClick={() => setTab("billed")}
          >
            Invoiced
          </button>
        </div>

        <section className="space-y-2">
          <div className="text-sm font-semibold">Drinks</div>
          <DrinkHistoryList items={items} />
        </section>

        <section className="space-y-2">
          <div className="text-sm font-semibold">Event bills</div>
          {billShares.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">No entries.</div>
          ) : (
            <ul className="space-y-2">
              {billShares.map((b) => (
                <li key={b.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0 truncate text-sm font-semibold">{b.title}</div>
                    <div className="shrink-0 tabular-nums text-sm text-neutral-700">{b.shareAmount}</div>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">{new Date(b.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <div className="text-sm font-semibold">Manual charges</div>
          {charges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">No entries.</div>
          ) : (
            <ul className="space-y-2">
              {charges.map((c) => (
                <li key={c.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0 truncate text-sm font-semibold">{c.title}</div>
                    <div className="shrink-0 tabular-nums text-sm text-neutral-700">{c.amount}</div>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">{new Date(c.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
