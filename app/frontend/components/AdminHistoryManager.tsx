import { useEffect, useMemo, useState } from "react";

type House = { id: string; name: string };
type Fridge = { id: string; name: string; active: boolean };
type Entry = {
  id: string;
  createdAt: string;
  quantity: number;
  priceAtTime: string;
  deleted: boolean;
  billed: boolean;
  user: { id: string; name: string; house: { id: string; name: string } };
  fridge: { id: string; name: string };
  product: { id: string; name: string };
};

export function AdminHistoryManager() {
  const [houses, setHouses] = useState<House[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [houseId, setHouseId] = useState("");
  const [fridgeId, setFridgeId] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [hRes, fRes] = await Promise.all([fetch("/api/houses"), fetch("/api/admin/fridges")]);
      if (hRes.ok) {
        const data = (await hRes.json()) as House[];
        if (!cancelled) setHouses(data);
      }
      if (fRes.ok) {
        const data = (await fRes.json()) as Fridge[];
        if (!cancelled) setFridges(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        const params = new URLSearchParams();
        params.set("take", "150");
        if (q.trim()) params.set("q", q.trim());
        if (houseId) params.set("houseId", houseId);
        if (fridgeId) params.set("fridgeId", fridgeId);
        if (includeDeleted) params.set("includeDeleted", "true");

        const res = await fetch(`/api/admin/drinks?${params.toString()}`);
        if (!res.ok) {
          if (!cancelled) setStatus("Failed loading entries");
          return;
        }
        const data = (await res.json()) as Entry[];
        if (!cancelled) setEntries(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fridgeId, houseId, includeDeleted, q, refreshTick]);

  const totalAmount = useMemo(() => entries.reduce((sum, e) => sum + Number(e.priceAtTime) * e.quantity, 0), [entries]);

  async function deleteEntry(entry: Entry) {
    if (!window.confirm(`Delete ${entry.quantity}× ${entry.product.name} from ${entry.user.name}?`)) return;

    const reason = window.prompt("Optional reason for audit log:", "") ?? "";
    setStatus(null);
    const res = await fetch(`/api/admin/drinks/${entry.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      setStatus("Failed deleting entry");
      return;
    }
    setStatus("Entry deleted");
    setRefreshTick((n) => n + 1);
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-sm font-semibold">Drink history (admin)</div>
      <p className="mt-1 text-xs text-neutral-600">Search/filter recent entries and soft-delete wrong logs.</p>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <input
          className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm"
          placeholder="Search resident, product or fridge…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm" value={houseId} onChange={(e) => setHouseId(e.target.value)}>
            <option value="">All houses</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm" value={fridgeId} onChange={(e) => setFridgeId(e.target.value)}>
            <option value="">All fridges</option>
            {fridges.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
          Include already deleted entries
        </label>
      </div>

      {status ? <div className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{status}</div> : null}
      <div className="mt-3 text-xs text-neutral-600">
        {loading ? "Loading…" : `${entries.length} entries · total ${totalAmount.toFixed(2)} EUR`}
      </div>

      {loading ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">Loading history…</div>
      ) : entries.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No matching entries.</div>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-neutral-200 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    {entry.quantity}× {entry.product.name}
                    {entry.deleted ? " (deleted)" : ""}
                  </div>
                  <div className="mt-1 truncate text-xs text-neutral-600">
                    {entry.user.name} · {entry.user.house.name} · {entry.fridge.name}
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-500">
                    {new Date(entry.createdAt).toLocaleString()} · {entry.billed ? "invoiced" : "not invoiced"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="tabular-nums text-xs text-neutral-700">{(Number(entry.priceAtTime) * entry.quantity).toFixed(2)} EUR</div>
                  {!entry.deleted ? (
                    <button type="button" className="mt-2 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void deleteEntry(entry)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
