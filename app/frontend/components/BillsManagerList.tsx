import { useEffect, useState } from "react";
import { useMe } from "./useMe";
import { BillDetailsDialog } from "./BillDetailsDialog";

type BillOverview = {
  id: string;
  title: string;
  totalAmount: string;
  createdAt: string;
  participantsCount: number;
  createdBy: { id: string; name: string; house: { id: string; name: string } };
  paidBy: { id: string; name: string } | null;
};

export function BillsManagerList() {
  const { me } = useMe();
  const [bills, setBills] = useState<BillOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsBillId, setDetailsBillId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bills");
        if (!res.ok) return;
        const data = (await res.json()) as BillOverview[];
        if (!cancelled) setBills(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-sm font-semibold">Extra bills (events)</div>
      {loading ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">Loading…</div>
      ) : null}
      {bills.length === 0 && !loading ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No bills yet.</div>
      ) : (
        <ul className="mt-3 space-y-2">
          {bills.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className="w-full rounded-xl border border-neutral-200 p-3 text-left text-sm transition hover:bg-neutral-50 active:scale-[0.99]"
                onClick={() => setDetailsBillId(b.id)}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0 truncate font-semibold">{b.title}</div>
                  <div className="shrink-0 tabular-nums">{b.totalAmount} €</div>
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {me?.role === "ADMIN" ? `${b.createdBy.house.name} · ` : ""}
                  by {b.createdBy.name}
                  {b.paidBy ? ` · paid by ${b.paidBy.name}` : ""}
                  {" · "}
                  {b.participantsCount} participant{b.participantsCount === 1 ? "" : "s"}
                  {" · "}
                  {new Date(b.createdAt).toLocaleString()} · tap for details
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {detailsBillId ? <BillDetailsDialog billId={detailsBillId} onClose={() => setDetailsBillId("")} /> : null}
    </div>
  );
}
