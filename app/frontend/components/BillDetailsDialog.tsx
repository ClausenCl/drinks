import { useEffect, useState } from "react";

type BillDetails = {
  id: string;
  title: string;
  totalAmount: string;
  createdAt: string;
  createdBy: { id: string; name: string; house: { id: string; name: string } };
  paidBy: { id: string; name: string } | null;
  participants: { id: string; shareAmount: string; user: { id: string; name: string; house: { id: string; name: string } } }[];
};

export function BillDetailsDialog(props: { billId: string; onClose: () => void }) {
  const [details, setDetails] = useState<BillDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        const res = await fetch(`/api/bills/${props.billId}`);
        if (!res.ok) {
          if (!cancelled) setStatus("Could not load bill details.");
          return;
        }
        const payload = (await res.json()) as BillDetails;
        if (!cancelled) setDetails(payload);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.billId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Bill details</div>
          <button type="button" className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold" onClick={props.onClose}>
            Close
          </button>
        </div>

        {loading ? <div className="mt-3 text-sm text-neutral-600">Loading…</div> : null}
        {status ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{status}</div> : null}

        {!loading && details ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="text-sm font-semibold">{details.title}</div>
              <div className="mt-1 text-xs text-neutral-600">
                Created by {details.createdBy.name} ({details.createdBy.house.name})
              </div>
              <div className="mt-1 text-xs text-neutral-600">
                {details.paidBy ? `Paid by ${details.paidBy.name}` : "No payer set"} · {new Date(details.createdAt).toLocaleString()}
              </div>
              <div className="mt-1 text-xs font-semibold tabular-nums text-neutral-800">Total: {details.totalAmount} EUR</div>
            </div>

            <div className="rounded-xl border border-neutral-200 p-3">
              <div className="text-xs font-medium text-neutral-600">Participants ({details.participants.length})</div>
              {details.participants.length === 0 ? (
                <div className="mt-2 text-sm text-neutral-600">No participants.</div>
              ) : (
                <ul className="mt-2 space-y-2">
                  {details.participants.map((participant) => (
                    <li key={participant.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <div className="min-w-0 truncate">
                        {participant.user.name} · {participant.user.house.name}
                      </div>
                      <div className="shrink-0 tabular-nums">{participant.shareAmount} EUR</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
