import { useEffect, useMemo, useState } from "react";

type UserHit = { id: string; name: string; houseId: string; houseName: string };
type MyBill = { id: string; billId: string; title: string; createdAt: string; shareAmount: string; billed: boolean };

export function BillCreator() {
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<UserHit[]>([]);
  const [selected, setSelected] = useState<Record<string, UserHit>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [myBills, setMyBills] = useState<MyBill[]>([]);

  const selectedList = useMemo(() => Object.values(selected), [selected]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/bills/me");
      if (!res.ok) return;
      const data = (await res.json()) as MyBill[];
      if (!cancelled) setMyBills(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      (async () => {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim())}`);
        if (!res.ok) return;
        const data = (await res.json()) as UserHit[];
        if (!cancelled) setHits(data);
      })();
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q]);

  async function createBill() {
    setStatus(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          totalAmount: total,
          paidByUserId: null,
          participantIds: selectedList.map((u) => u.id),
        }),
      });
      if (!res.ok) {
        setStatus("Failed to create bill");
        return;
      }
      setTitle("");
      setTotal("");
      setSelected({});
      setQ("");
      setHits([]);
      setStatus("Created");
      const mine = await fetch("/api/bills/me");
      if (mine.ok) setMyBills((await mine.json()) as MyBill[]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">Create shared bill</div>
        <div className="mt-3 space-y-3">
        <label className="block">
          <div className="mb-1 text-xs font-medium text-neutral-600">Title</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Party snacks"
          />
        </label>
        <label className="block">
          <div className="mb-1 text-xs font-medium text-neutral-600">Total amount</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tabular-nums"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="e.g. 23.50"
            inputMode="decimal"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-medium text-neutral-600">Participants (search any house)</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type 2+ letters…"
          />
        </label>

        {hits.length > 0 ? (
          <div className="max-h-56 overflow-auto rounded-xl border border-neutral-200">
            {hits.map((u) => {
              const isSelected = Boolean(selected[u.id]);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() =>
                    setSelected((prev) => {
                      const next = { ...prev };
                      if (next[u.id]) delete next[u.id];
                      else next[u.id] = u;
                      return next;
                    })
                  }
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{u.name}</div>
                    <div className="truncate text-xs text-neutral-500">{u.houseName}</div>
                  </div>
                  <div className="shrink-0 text-xs text-neutral-600">{isSelected ? "Selected" : "Add"}</div>
                </button>
              );
            })}
          </div>
        ) : null}

        {selectedList.length > 0 ? (
          <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-800">
            Participants: {selectedList.map((u) => u.name).join(", ")}
          </div>
        ) : null}

        {status ? <div className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{status}</div> : null}

        <button
          type="button"
          onClick={() => void createBill()}
          disabled={submitting || !title.trim() || !total.trim() || selectedList.length === 0}
          className="w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create bill"}
        </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">My bill shares</div>
        {myBills.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No bills yet.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {myBills.map((b) => (
              <li key={b.id} className="rounded-xl border border-neutral-200 p-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0 truncate font-semibold">{b.title}</div>
                  <div className="shrink-0 tabular-nums">{b.shareAmount}</div>
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {new Date(b.createdAt).toLocaleString()} · {b.billed ? "invoiced" : "not invoiced"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
