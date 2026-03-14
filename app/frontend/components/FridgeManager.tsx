import { useEffect, useMemo, useState } from "react";

type Fridge = { id: string; name: string };
type FridgeDetails = {
  id: string;
  name: string;
  locationDescription: string;
  products: { id: string; name: string; price: string; active: boolean; inFridge: boolean }[];
};

export function FridgeManager() {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [details, setDetails] = useState<FridgeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/manage/fridges");
        if (!res.ok) return;
        const data = (await res.json()) as Fridge[];
        if (cancelled) return;
        setFridges(data);
        if (!selectedId && data[0]) setSelectedId(data[0].id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      setStatus(null);
      const res = await fetch(`/api/manage/fridges/${selectedId}`);
      if (!res.ok) return;
      const data = (await res.json()) as FridgeDetails;
      if (!cancelled) setDetails(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const productIdsInFridge = useMemo(() => {
    return (details?.products ?? []).filter((p) => p.inFridge).map((p) => p.id);
  }, [details]);

  async function saveAvailability() {
    if (!details) return;
    setStatus(null);
    const res = await fetch(`/api/manage/fridges/${details.id}/products`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productIds: productIdsInFridge }),
    });
    setStatus(res.ok ? "Saved availability" : "Failed saving availability");
  }

  async function updatePrice(productId: string, price: string) {
    setStatus(null);
    const res = await fetch(`/api/manage/products/${productId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ price }),
    });
    if (!res.ok) {
      setStatus("Failed updating price");
      return;
    }
    const updated = (await res.json()) as { id: string; price: string };
    setDetails((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        products: prev.products.map((p) => (p.id === updated.id ? { ...p, price: updated.price } : p)),
      };
    });
    setStatus("Saved price");
  }

  if (loading) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">Loading fridges…</div>;
  }

  if (fridges.length === 0) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">No fridges found.</div>;
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-sm font-semibold">Fridges & prices</div>
      <div className="mt-3 space-y-3">
        <label className="block">
          <div className="mb-1 text-xs font-medium text-neutral-600">Select fridge</div>
          <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {fridges.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>

        {status ? <div className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{status}</div> : null}

        {details ? (
          <div className="space-y-2">
            {details.products.map((p) => (
              <div key={p.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={p.inFridge}
                      onChange={(e) =>
                        setDetails((prev) =>
                          prev
                            ? { ...prev, products: prev.products.map((x) => (x.id === p.id ? { ...x, inFridge: e.target.checked } : x)) }
                            : prev
                        )
                      }
                    />
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                  </label>
                  <div className="shrink-0 text-xs text-neutral-500">{p.active ? "active" : "inactive"}</div>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="w-28 rounded-xl border border-neutral-200 px-3 py-2 text-sm tabular-nums"
                    value={p.price}
                    onChange={(e) =>
                      setDetails((prev) =>
                        prev ? { ...prev, products: prev.products.map((x) => (x.id === p.id ? { ...x, price: e.target.value } : x)) } : prev
                      )
                    }
                    inputMode="decimal"
                  />
                  <button type="button" className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white" onClick={() => void updatePrice(p.id, p.price)}>
                    Save price
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white" onClick={() => void saveAvailability()}>
              Save availability
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">Loading fridge…</div>
        )}
      </div>
    </div>
  );
}

