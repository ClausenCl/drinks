import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

type FridgeSummary = {
  id: string;
  name: string;
  active: boolean;
  hasHistory: boolean;
};

type Manager = {
  id: string;
  name: string;
  houseId: string;
};

type FridgeDetails = {
  id: string;
  name: string;
  active: boolean;
  hasHistory: boolean;
  managerIds: string[];
  items: { id: string; name: string; price: string; active: boolean; createdAt: string }[];
};

export function AdminFridgeCrud() {
  const router = useRouter();
  const focusFridgeId = typeof router.query.focus === "string" ? router.query.focus : "";
  const [fridges, setFridges] = useState<FridgeSummary[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [details, setDetails] = useState<FridgeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newManagerIds, setNewManagerIds] = useState<Record<string, boolean>>({});
  const [draftName, setDraftName] = useState("");
  const [draftManagerIds, setDraftManagerIds] = useState<Record<string, boolean>>({});
  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [createActive, setCreateActive] = useState(true);
  const [rowStatus, setRowStatus] = useState<Record<string, string>>({});
  const [qrVersion, setQrVersion] = useState(0);

  const activeFridges = useMemo(() => fridges.filter((fridge) => fridge.active), [fridges]);
  const sortedItems = useMemo(() => {
    return [...(details?.items ?? [])].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [details?.items]);

  async function refreshFridges(preferredId?: string) {
    const [fridgeRes, managerRes] = await Promise.all([fetch("/api/admin/fridges"), fetch("/api/admin/ministers")]);
    if (!fridgeRes.ok || !managerRes.ok) return;

    const fridgeData = (await fridgeRes.json()) as FridgeSummary[];
    const managerData = (await managerRes.json()) as Manager[];
    setFridges(fridgeData);
    setManagers(managerData);

    const visibleFridges = fridgeData.filter((fridge) => fridge.active);
    const candidateId = preferredId || selectedId || focusFridgeId;
    if (candidateId && visibleFridges.some((fridge) => fridge.id === candidateId)) {
      setSelectedId(candidateId);
      return;
    }
    setSelectedId(visibleFridges[0]?.id ?? "");
  }

  async function loadSelectedFridge(id: string) {
    const [detailRes, metaRes] = await Promise.all([fetch(`/api/manage/fridges/${id}`), fetch(`/api/admin/fridges/${id}`)]);
    if (!detailRes.ok || !metaRes.ok) return;

    const detailData = (await detailRes.json()) as {
      id: string;
      name: string;
      active: boolean;
      items: FridgeDetails["items"];
    };
    const metaData = (await metaRes.json()) as { name: string; active: boolean; hasHistory: boolean; managerIds: string[] };

    setDetails({
      id: detailData.id,
      name: detailData.name,
      active: detailData.active,
      items: detailData.items,
      hasHistory: metaData.hasHistory,
      managerIds: metaData.managerIds,
    });
    setDraftName(metaData.name);
    setDraftManagerIds(Object.fromEntries(metaData.managerIds.map((managerId) => [managerId, true])));
    setQrVersion((value) => value + 1);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshFridges(focusFridgeId);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusFridgeId]);

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setStatus(null);
      await loadSelectedFridge(selectedId);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function toggleManager(
    mapper: (value: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void,
    managerId: string,
    checked: boolean
  ) {
    mapper((prev) => ({ ...prev, [managerId]: checked }));
  }

  async function createFridge(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const managerIds = Object.entries(newManagerIds)
      .filter(([, checked]) => checked)
      .map(([managerId]) => managerId);
    const res = await fetch("/api/admin/fridges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName, managerIds }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Failed creating fridge");
      return;
    }

    const created = (await res.json()) as FridgeSummary;
    setNewName("");
    setNewManagerIds({});
    setShowCreate(false);
    setStatus("Fridge created");
    await refreshFridges(created.id);
  }

  async function saveFridge() {
    if (!details) return;
    setStatus(null);
    const managerIds = Object.entries(draftManagerIds)
      .filter(([, checked]) => checked)
      .map(([managerId]) => managerId);

    const res = await fetch(`/api/admin/fridges/${details.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: draftName, managerIds }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Failed saving fridge");
      return;
    }

    setStatus("Fridge saved");
    await refreshFridges(details.id);
    await loadSelectedFridge(details.id);
  }

  async function archiveFridge() {
    if (!details) return;
    if (!window.confirm(`Archive fridge "${details.name}"?`)) return;
    setStatus(null);
    const res = await fetch(`/api/admin/fridges/${details.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Failed archiving fridge");
      return;
    }

    setStatus("Fridge archived");
    await refreshFridges("");
  }

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
    setStatus("Drink added");
    await loadSelectedFridge(details.id);
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
    setRowStatus((prev) => ({ ...prev, [item.id]: "Saved" }));
    await loadSelectedFridge(details.id);
  }

  if (loading) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">Loading fridges…</div>;
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Fridges</div>
          <p className="mt-1 text-xs text-neutral-600">Only active fridges are shown here. Select one to manage its QR code, drinks, and manager access.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          {showCreate ? "Close add fridge" : "Add fridge"}
        </button>
      </div>

      {showCreate ? (
        <form onSubmit={createFridge} className="mt-4 rounded-xl border border-neutral-200 p-3">
          <div className="text-xs font-medium text-neutral-600">New fridge</div>
          <label className="mt-2 block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Fridge name</div>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </label>
          <div className="mt-3">
            <div className="mb-2 text-xs font-medium text-neutral-600">Managers with access</div>
            {managers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No active managers found.</div>
            ) : (
              <div className="space-y-2">
                {managers.map((manager) => (
                  <label key={manager.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(newManagerIds[manager.id])}
                      onChange={(e) => toggleManager(setNewManagerIds, manager.id, e.target.checked)}
                    />
                    <span>{manager.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="mt-3 w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white" disabled={!newName.trim()}>
            Create fridge
          </button>
        </form>
      ) : null}

      {status ? <div className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{status}</div> : null}

      {activeFridges.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No active fridges. Add one to continue.</div>
      ) : (
        <label className="mt-4 block">
          <div className="mb-1 text-xs font-medium text-neutral-600">Select fridge</div>
          <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {activeFridges.map((fridge) => (
              <option key={fridge.id} value={fridge.id}>
                {fridge.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {details ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-neutral-200 p-3">
            <div className="text-xs font-medium text-neutral-600">Selected fridge</div>
            <label className="mt-2 block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Name</div>
              <input
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                disabled={details.hasHistory}
                title={details.hasHistory ? "Renaming is blocked once purchases exist" : undefined}
              />
            </label>
            {details.hasHistory ? <div className="mt-1 text-xs text-neutral-500">Renaming is blocked once purchases exist.</div> : null}
            <div className="mt-3">
              <div className="mb-2 text-xs font-medium text-neutral-600">Managers with access</div>
              {managers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No active managers found.</div>
              ) : (
                <div className="space-y-2">
                  {managers.map((manager) => (
                    <label key={manager.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(draftManagerIds[manager.id])}
                        onChange={(e) => toggleManager(setDraftManagerIds, manager.id, e.target.checked)}
                      />
                      <span>{manager.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className="flex-1 rounded-xl bg-black px-3 py-3 text-sm font-semibold text-white" onClick={() => void saveFridge()}>
                Save fridge
              </button>
              <button type="button" className="rounded-xl border border-neutral-200 px-3 py-3 text-sm font-semibold text-neutral-800" onClick={() => void archiveFridge()}>
                Archive
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3">
            <div className="text-xs font-medium text-neutral-600">QR code</div>
            <p className="mt-1 text-xs text-neutral-600">Scanning opens this fridge directly and reuses an existing login session when one is present.</p>
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
            <div className="text-xs font-medium text-neutral-600">Add drink</div>
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
              Add drink
            </button>
          </form>

          <div className="space-y-2">
            {sortedItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">{new Date(item.createdAt).toLocaleString()}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                    value={item.name}
                    onChange={(e) =>
                      setDetails((prev) =>
                        prev ? { ...prev, items: prev.items.map((current) => (current.id === item.id ? { ...current, name: e.target.value } : current)) } : prev
                      )
                    }
                  />
                  <input
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm tabular-nums"
                    value={item.price}
                    onChange={(e) =>
                      setDetails((prev) =>
                        prev ? { ...prev, items: prev.items.map((current) => (current.id === item.id ? { ...current, price: e.target.value } : current)) } : prev
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
                        prev ? { ...prev, items: prev.items.map((current) => (current.id === item.id ? { ...current, active: e.target.checked } : current)) } : prev
                      )
                    }
                  />
                  Active
                </label>
                <button type="button" className="mt-2 w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white" onClick={() => void updateItem(item)}>
                  Save drink
                </button>
                {rowStatus[item.id] ? <div className="mt-2 text-xs text-neutral-600">{rowStatus[item.id]}</div> : null}
              </div>
            ))}
            {sortedItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No drinks in this fridge yet.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
