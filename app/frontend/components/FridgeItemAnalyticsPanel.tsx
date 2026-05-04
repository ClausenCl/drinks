import { useEffect, useMemo, useState } from "react";

type Row = {
  fridgeId: string;
  fridgeName: string;
  itemName: string;
  quantity: number;
  total: string;
  lastAt: string;
};

export function FridgeItemAnalyticsPanel() {
  const [rangeDays, setRangeDays] = useState("30");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        const params = new URLSearchParams();
        params.set("rangeDays", rangeDays);
        const res = await fetch(`/api/reports/fridge-items?${params.toString()}`);
        if (!res.ok) {
          if (!cancelled) setStatus("Could not load fridge analytics.");
          return;
        }
        const data = (await res.json()) as Row[];
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeDays]);

  const totalValue = useMemo(() => rows.reduce((sum, row) => sum + Number(row.total), 0), [rows]);
  const totalCount = useMemo(() => rows.reduce((sum, row) => sum + row.quantity, 0), [rows]);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Fridge item analytics</div>
        <a
          href={`/api/reports/fridge-items?rangeDays=${encodeURIComponent(rangeDays)}&format=csv`}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold hover:bg-neutral-50"
        >
          Export CSV
        </a>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="text-xs text-neutral-600">Range</div>
        <select
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold"
          value={rangeDays}
          onChange={(event) => setRangeDays(event.target.value)}
        >
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">365 days</option>
          <option value="0">All time</option>
        </select>
      </div>

      <div className="mt-2 text-xs text-neutral-600">
        {loading ? "Loading…" : `${rows.length} item rows · ${totalCount} drinks · ${totalValue.toFixed(2)} EUR`}
      </div>
      {status ? <div className="mt-2 rounded-xl bg-red-50 p-2 text-xs text-red-700">{status}</div> : null}

      {!loading && rows.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No analytics rows in this range.</div>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-neutral-200">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-2 py-2 text-left font-semibold">Fridge</th>
                <th className="px-2 py-2 text-left font-semibold">Item</th>
                <th className="px-2 py-2 text-right font-semibold">Qty</th>
                <th className="px-2 py-2 text-right font-semibold">Total</th>
                <th className="px-2 py-2 text-right font-semibold">Last entry</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.fridgeId}-${row.itemName}`} className="border-t border-neutral-100">
                  <td className="px-2 py-2">{row.fridgeName}</td>
                  <td className="px-2 py-2">{row.itemName}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.quantity}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{Number(row.total).toFixed(2)} EUR</td>
                  <td className="px-2 py-2 text-right">{new Date(row.lastAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
