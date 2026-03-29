import { useEffect, useMemo, useState } from "react";
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
  const [query, setQuery] = useState("");
  const [fridgeFilter, setFridgeFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
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

  const normalizedQuery = query.trim().toLowerCase();
  const sortFactor = sortOrder === "newest" ? -1 : 1;

  const fridgeOptions = useMemo(() => Array.from(new Set(items.map((i) => i.fridgeName))).sort((a, b) => a.localeCompare(b)), [items]);

  const filteredDrinks = useMemo(() => {
    return items
      .filter((item) => {
        if (fridgeFilter && item.fridgeName !== fridgeFilter) return false;
        if (!normalizedQuery) return true;
        return item.productName.toLowerCase().includes(normalizedQuery) || item.fridgeName.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sortFactor);
  }, [fridgeFilter, items, normalizedQuery, sortFactor]);

  const filteredBillShares = useMemo(() => {
    return billShares
      .filter((bill) => {
        if (!normalizedQuery) return true;
        return bill.title.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sortFactor);
  }, [billShares, normalizedQuery, sortFactor]);

  const filteredCharges = useMemo(() => {
    return charges
      .filter((charge) => {
        if (!normalizedQuery) return true;
        return charge.title.toLowerCase().includes(normalizedQuery);
      })
      .sort((a, b) => (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sortFactor);
  }, [charges, normalizedQuery, sortFactor]);

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
          <div className="rounded-2xl border border-neutral-200 bg-white p-3">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Search</div>
              <input
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find drinks, event bills or charges…"
              />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <div className="mb-1 text-xs font-medium text-neutral-600">Fridge (drinks)</div>
                <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" value={fridgeFilter} onChange={(e) => setFridgeFilter(e.target.value)}>
                  <option value="">All fridges</option>
                  {fridgeOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="mb-1 text-xs font-medium text-neutral-600">Order</div>
                <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <div className="text-sm font-semibold">Drinks</div>
          <DrinkHistoryList items={filteredDrinks} />
        </section>

        <section className="space-y-2">
          <div className="text-sm font-semibold">Event bills</div>
          {filteredBillShares.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">No entries.</div>
          ) : (
            <ul className="space-y-2">
              {filteredBillShares.map((b) => (
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
          {filteredCharges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">No entries.</div>
          ) : (
            <ul className="space-y-2">
              {filteredCharges.map((c) => (
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
