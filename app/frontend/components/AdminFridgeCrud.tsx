import { useEffect, useState } from "react";

type Fridge = {
  id: string;
  name: string;
  active: boolean;
  hasHistory: boolean;
};

export function AdminFridgeCrud() {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const [name, setName] = useState("");

  const [drafts, setDrafts] = useState<Record<string, { name: string; active: boolean }>>({});
  const [rowStatus, setRowStatus] = useState<Record<string, string>>({});

  async function refresh() {
    const res = await fetch("/api/admin/fridges");
    if (!res.ok) return;
    const data = (await res.json()) as Fridge[];
    setFridges(data);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const f of data) {
        if (!next[f.id]) next[f.id] = { name: f.name, active: f.active };
      }
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createFridge(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/admin/fridges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Failed");
      return;
    }
    setName("");
    setStatus("Created");
    await refresh();
  }

  async function saveFridge(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setRowStatus((p) => ({ ...p, [id]: "" }));
    const res = await fetch(`/api/admin/fridges/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setRowStatus((p) => ({ ...p, [id]: body?.message ?? body?.error ?? "Failed" }));
      return;
    }
    setRowStatus((p) => ({ ...p, [id]: "Saved" }));
    await refresh();
  }

  if (loading) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">Loading fridges…</div>;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createFridge} className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">Fridges (admin)</div>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">New fridge name</div>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {status ? <div className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{status}</div> : null}
          <button type="submit" className="w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white" disabled={!name.trim()}>
            Create fridge
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">Edit / archive</div>
        {fridges.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No fridges.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {fridges.map((f) => {
              const draft = drafts[f.id] ?? { name: f.name, active: f.active };
              const st = rowStatus[f.id];
              return (
                <div key={f.id} className="rounded-xl border border-neutral-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{f.name}</div>
                      <div className="text-xs text-neutral-600">{f.active ? "active" : "archived"}</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold"
                      onClick={() => setDrafts((p) => ({ ...p, [f.id]: { ...draft, active: !draft.active } }))}
                    >
                      {draft.active ? "Archive" : "Restore"}
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    <label className="block">
                      <div className="mb-1 text-xs font-medium text-neutral-600">Name</div>
                      <input
                        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                        value={draft.name}
                        onChange={(e) => setDrafts((p) => ({ ...p, [f.id]: { ...draft, name: e.target.value } }))}
                        disabled={f.hasHistory}
                        title={f.hasHistory ? "Renaming is blocked once purchases exist" : undefined}
                      />
                      {f.hasHistory ? <div className="mt-1 text-xs text-neutral-500">Renaming blocked once purchases exist.</div> : null}
                    </label>
                  </div>

                  <button type="button" className="mt-3 w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white" onClick={() => void saveFridge(f.id)}>
                    Save changes
                  </button>
                  {st ? <div className="mt-2 text-xs text-neutral-600">{st}</div> : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
