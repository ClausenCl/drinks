import { useEffect, useMemo, useState } from "react";
import { useMe } from "./useMe";

type BillingRun = { id: string; houseId: string; houseName: string; title: string; createdAt: string; hasPdf: boolean };
type House = { id: string; name: string };
type Member = { id: string; name: string };

export function BillingRuns() {
  const { me } = useMe();
  const [runs, setRuns] = useState<BillingRun[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [houseId, setHouseId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [carryovers, setCarryovers] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!me) return;
    if (me.role === "ADMIN") {
      (async () => {
        const res = await fetch("/api/houses");
        if (!res.ok) return;
        const data = (await res.json()) as House[];
        setHouses(data);
        setHouseId(data[0]?.id ?? "");
      })();
    } else {
      setHouseId(me.houseId);
    }
  }, [me]);

  async function refreshRuns() {
    const res = await fetch("/api/billing-runs");
    if (!res.ok) return;
    setRuns((await res.json()) as BillingRun[]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshRuns();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!houseId) return;
    (async () => {
      const res = await fetch(`/api/houses/${houseId}/members`);
      if (!res.ok) return;
      const data = (await res.json()) as Member[];
      setMembers(data);
      setCarryovers(Object.fromEntries(data.map((m) => [m.id, "0"])));
    })();
  }, [houseId]);

  const selectedHouseName = useMemo(() => houses.find((h) => h.id === houseId)?.name ?? "", [houses, houseId]);

  async function createRun(e: React.FormEvent) {
    e.preventDefault();
    if (!houseId || !title.trim()) return;
    setStatus(null);
    setCreating(true);
    try {
      const res = await fetch("/api/billing-runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ houseId, title, carryovers }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        setStatus(body?.message ?? body?.error ?? "Failed");
        return;
      }
      setTitle("");
      setStatus("Created");
      await refreshRuns();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">Billing runs</div>
        {loading ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">Loading…</div>
        ) : null}
        {runs.length === 0 && !loading ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No billing runs yet.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {runs.map((r) => (
              <li key={r.id} className="rounded-xl border border-neutral-200 p-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0 truncate font-semibold">{r.title}</div>
                  {r.hasPdf ? (
                    <a className="shrink-0 underline" href={`/api/billing-runs/${r.id}/pdf`} target="_blank" rel="noreferrer">
                      PDF
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-neutral-500">no pdf</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {r.houseName} · {new Date(r.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form id="billing-create" onSubmit={createRun} className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">Create billing run</div>
        <div className="mt-3 space-y-3">
          {me?.role === "ADMIN" ? (
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">House</div>
              <select
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base"
                value={houseId}
                onChange={(e) => setHouseId(e.target.value)}
              >
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="text-xs text-neutral-600">House: {selectedHouseName || "…"}</div>
          )}

          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Title</div>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. March 2026" />
          </label>

          <div>
            <div className="mb-2 text-xs font-medium text-neutral-600">Carryover per user (default 0)</div>
            <div className="max-h-64 overflow-auto rounded-xl border border-neutral-200">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0 truncate">{m.name}</div>
                  <input
                    className="w-24 rounded-xl border border-neutral-200 px-3 py-2 text-sm tabular-nums"
                    value={carryovers[m.id] ?? "0"}
                    onChange={(e) => setCarryovers((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    inputMode="decimal"
                  />
                </div>
              ))}
            </div>
          </div>

          {status ? <div className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{status}</div> : null}

          <button type="submit" disabled={creating || !houseId || !title.trim()} className="w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white disabled:opacity-50">
            {creating ? "Creating…" : "Create + generate PDF"}
          </button>
        </div>
      </form>
    </div>
  );
}
