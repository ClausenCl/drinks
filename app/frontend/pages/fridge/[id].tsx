import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { useMe } from "../../components/useMe";

type FridgeDetails = {
  id: string;
  name: string;
  products: { id: string; name: string; price: string }[];
};

export default function FridgePage() {
  const router = useRouter();
  const fridgeId = typeof router.query.id === "string" ? router.query.id : null;
  const [data, setData] = useState<FridgeDetails | null>(null);
  const { me, loading } = useMe();

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [undoToken, setUndoToken] = useState<string | null>(null);
  const [undoExpiresAt, setUndoExpiresAt] = useState<number | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!loading && !me && fridgeId) void router.replace({ pathname: "/", query: { next: `/fridge/${fridgeId}` } });
    if (!loading && me && me.role !== "BEWOHNER") void router.replace(me.role === "ADMIN" ? "/admin" : "/manager");
  }, [fridgeId, loading, me, router]);

  useEffect(() => {
    if (!fridgeId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/fridges/${fridgeId}`);
      if (!res.ok) return;
      const json = (await res.json()) as FridgeDetails;
      if (!cancelled) {
        setData(json);
        setCounts(Object.fromEntries(json.products.map((p) => [p.id, 0])));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fridgeId]);

  useEffect(() => {
    if (!undoExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((undoExpiresAt - Date.now()) / 1000));
      setUndoSecondsLeft(left);
      if (left <= 0) {
        setUndoToken(null);
        setUndoExpiresAt(null);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [undoExpiresAt]);

  function inc(productId: string, delta: number) {
    setCounts((prev) => {
      const next = { ...prev };
      const current = next[productId] ?? 0;
      next[productId] = Math.max(0, current + delta);
      return next;
    });
  }

  async function submit() {
    if (!fridgeId) return;
    if (!data) return;
    const items = data.products
      .map((p) => ({ productId: p.id, quantity: counts[p.id] ?? 0 }))
      .filter((x) => x.quantity > 0);
    if (items.length === 0) {
      setStatus("Select at least one item.");
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fridgeId, items }),
      });
      if (!res.ok) {
        setStatus("Failed to save purchase.");
        return;
      }
      const body = (await res.json()) as { undoToken: string; undoExpiresAt: string; summary: { name: string; quantity: number }[] };
      setUndoToken(body.undoToken);
      setUndoExpiresAt(new Date(body.undoExpiresAt).getTime());
      setStatus(`Bought: ${body.summary.map((s) => `${s.quantity}× ${s.name}`).join(", ")}`);
      setCounts(Object.fromEntries(data.products.map((p) => [p.id, 0])));
    } finally {
      setSubmitting(false);
    }
  }

  async function undo() {
    if (!undoToken) return;
    const token = undoToken;
    setStatus(null);
    const res = await fetch("/api/purchases/undo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      setStatus("Undo failed.");
      return;
    }
    setUndoToken(null);
    setUndoExpiresAt(null);
    setUndoSecondsLeft(0);
    setStatus("Undone.");
  }

  return (
    <AppShell title={data?.name ?? "Fridge"}>
      {status ? <div className="mb-3 rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white">{status}</div> : null}
      <div className="space-y-3">
        {(data?.products ?? []).map((p) => (
          <div key={p.id} className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-neutral-500">{p.price} EUR</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="h-10 w-10 rounded-xl bg-neutral-100 text-lg font-semibold"
                  onClick={() => inc(p.id, -1)}
                >
                  –
                </button>
                <div className="w-10 text-center text-base tabular-nums">{counts[p.id] ?? 0}</div>
                <button
                  type="button"
                  className="h-10 w-10 rounded-xl bg-neutral-100 text-lg font-semibold"
                  onClick={() => inc(p.id, +1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
        {!data ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">Loading fridge...</div>
        ) : null}

        <button
          type="button"
          disabled={submitting || !data}
          onClick={() => void submit()}
          className="w-full rounded-xl bg-black px-4 py-4 text-base font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Enter"}
        </button>

        {undoToken && undoSecondsLeft > 0 ? (
          <button
            type="button"
            onClick={() => void undo()}
            className="w-full rounded-xl bg-neutral-100 px-4 py-4 text-base font-semibold"
          >
            Undo ({undoSecondsLeft}s)
          </button>
        ) : null}
      </div>
    </AppShell>
  );
}
