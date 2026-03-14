import { useEffect, useState } from "react";

type Row = {
  fridgeId: string;
  fridgeName: string;
  productId: string;
  productName: string;
  quantity: number;
  total: string;
};

export function ResidentConsumptionTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reports/unbilled");
        if (!res.ok) return;
        const data = (await res.json()) as Row[];
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">Loading…</div>;
  }

  if (rows.length === 0) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">No unbilled entries.</div>;
  }

  const grouped = rows.reduce<Record<string, Row[]>>((acc, row) => {
    (acc[row.fridgeName] ??= []).push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([fridgeName, items]) => (
        <div key={fridgeName} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="text-sm font-semibold">{fridgeName}</div>
          <ul className="mt-3 space-y-2">
            {items.map((it) => (
              <li key={it.productId} className="flex items-baseline justify-between gap-3 text-sm">
                <div className="min-w-0 truncate">
                  {it.quantity}× {it.productName}
                </div>
                <div className="shrink-0 tabular-nums text-neutral-700">{Number(it.total).toFixed(2)}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
