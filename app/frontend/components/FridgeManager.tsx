import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Fridge = { id: string; name: string };
type FridgeDetails = {
  id: string;
  name: string;
  items: { id: string; name: string; price: string; active: boolean; createdAt: string }[];
};

export function FridgeManager() {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [details, setDetails] = useState<FridgeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [createActive, setCreateActive] = useState(true);
  const [rowStatus, setRowStatus] = useState<Record<string, string>>({});
  const [qrVersion, setQrVersion] = useState(0);

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
    setQrVersion((value) => value + 1);
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

  const sortedItems = useMemo(() => {
    return [...(details?.items ?? [])].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [details?.items]);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    if (!details) return;
    setStatus(null);
    const res = await fetch(`/api/manage/fridges/${details.id}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: createName, price: createPrice, active: createActive }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Failed creating item");
      return;
    }
    setCreateName("");
    setCreatePrice("");
    setCreateActive(true);
    setStatus("Item created");
    const next = await fetch(`/api/manage/fridges/${details.id}`);
    if (next.ok) setDetails((await next.json()) as FridgeDetails);
  }

  async function updateItem(item: { id: string; name: string; price: string; active: boolean }) {
    if (!details) return;
    setRowStatus((prev) => ({ ...prev, [item.id]: "" }));
    const res = await fetch(`/api/manage/fridges/${details.id}/items/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: item.name, price: item.price, active: item.active }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setRowStatus((prev) => ({ ...prev, [item.id]: body?.message ?? body?.error ?? "Failed" }));
      return;
    }
    const updated = (await res.json()) as { id: string; name: string; price: string; active: boolean; createdAt: string };
    setDetails((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((p) => (p.id === updated.id ? { ...p, name: updated.name, price: updated.price, active: updated.active } : p)),
      };
    });
    setRowStatus((prev) => ({ ...prev, [item.id]: "Saved" }));
  }

  if (loading) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">Loading fridges…</div>;
  }

  if (fridges.length === 0) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">No fridges found.</div>;
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-sm font-semibold">Fridge items & prices</div>
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
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200 p-3">
              <div className="text-xs font-medium text-neutral-600">Fridge QR</div>
              <p className="mt-1 text-xs text-neutral-600">
                Scan opens this fridge directly. If logged out, resident selection appears first and then returns to this fridge.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Image
                  key={`${details.id}-${qrVersion}`}
                  src={`/api/manage/fridges/${details.id}/qr?v=${qrVersion}`}
                  alt={`QR code for ${details.name}`}
                  width={112}
                  height={112}
                  className="h-28 w-28 rounded-lg border border-neutral-200 bg-white p-1"
                  unoptimized
                />
                <a
                  href={`/api/manage/fridges/${details.id}/qr?download=1&v=${qrVersion}`}
                  className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white"
                >
                  Download PNG
                </a>
              </div>
            </div>

            <form onSubmit={createItem} className="rounded-xl border border-neutral-200 p-3">
              <div className="text-xs font-medium text-neutral-600">Add new item</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  placeholder="Name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
                <input
                  className="rounded-xl border border-neutral-200 px-3 py-2 text-sm tabular-nums"
                  placeholder="Price"
                  value={createPrice}
                  onChange={(e) => setCreatePrice(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={createActive} onChange={(e) => setCreateActive(e.target.checked)} />
                Active
              </label>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white"
                disabled={!createName.trim() || !createPrice.trim()}
              >
                Create item
              </button>
            </form>

            {sortedItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">{new Date(item.createdAt).toLocaleString()}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                    value={item.name}
                    onChange={(e) =>
                      setDetails((prev) =>
                        prev ? { ...prev, items: prev.items.map((x) => (x.id === item.id ? { ...x, name: e.target.value } : x)) } : prev
                      )
                    }
                  />
                  <input
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm tabular-nums"
                    value={item.price}
                    onChange={(e) =>
                      setDetails((prev) =>
                        prev ? { ...prev, items: prev.items.map((x) => (x.id === item.id ? { ...x, price: e.target.value } : x)) } : prev
                      )
                    }
                    inputMode="decimal"
                  />
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.active}
                    onChange={(e) =>
                      setDetails((prev) =>
                        prev ? { ...prev, items: prev.items.map((x) => (x.id === item.id ? { ...x, active: e.target.checked } : x)) } : prev
                      )
                    }
                  />
                  Active
                </label>
                <button type="button" className="mt-2 w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white" onClick={() => void updateItem(item)}>
                  Save item
                </button>
                {rowStatus[item.id] ? <div className="mt-2 text-xs text-neutral-600">{rowStatus[item.id]}</div> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">Loading fridge…</div>
        )}
      </div>
    </div>
  );
}
