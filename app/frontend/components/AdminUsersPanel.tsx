import { useEffect, useState } from "react";
import { useMe } from "./useMe";

type House = { id: string; name: string; color: string };
type UserRow = {
  id: string;
  name: string;
  role: "BEWOHNER";
  houseId: string;
  house: House;
  active: boolean;
  hasPin: boolean;
  requirePinOnPurchase: boolean;
  createdAt: string;
  updatedAt: string;
};

type Draft = { name: string; houseId: string; pin: string; requirePinOnPurchase: boolean };

export function AdminUsersPanel() {
  const { me } = useMe();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [houseId, setHouseId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, string>>({});

  const isAdmin = me?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/houses");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as House[];
      setHouses(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        const params = new URLSearchParams();
        params.set("take", "200");
        if (query.trim()) params.set("q", query.trim());
        if (isAdmin && houseId) params.set("houseId", houseId);
        if (includeInactive) params.set("includeInactive", "true");
        const res = await fetch(`/api/manage/users?${params.toString()}`);
        if (!res.ok) {
          if (!cancelled) setStatus("Failed loading residents");
          return;
        }
        const data = (await res.json()) as UserRow[];
        if (cancelled) return;
        setUsers(data);
        setDrafts((prev) => {
          const next: Record<string, Draft> = {};
          for (const user of data) {
            next[user.id] = {
              name: user.name,
              houseId: user.houseId,
              pin: prev[user.id]?.pin ?? "",
              requirePinOnPurchase: user.requirePinOnPurchase,
            };
          }
          return next;
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [houseId, includeInactive, isAdmin, query]);

  async function refreshUsers() {
    const params = new URLSearchParams();
    params.set("take", "200");
    if (query.trim()) params.set("q", query.trim());
    if (isAdmin && houseId) params.set("houseId", houseId);
    if (includeInactive) params.set("includeInactive", "true");
    const res = await fetch(`/api/manage/users?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as UserRow[];
    setUsers(data);
    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const user of data) {
        next[user.id] = {
          name: user.name,
          houseId: user.houseId,
          pin: prev[user.id]?.pin ?? "",
          requirePinOnPurchase: user.requirePinOnPurchase,
        };
      }
      return next;
    });
  }

  async function saveUser(userId: string) {
    const draft = drafts[userId];
    const current = users.find((user) => user.id === userId);
    if (!draft || !current) return;

    setRowStatus((prev) => ({ ...prev, [userId]: "" }));
    const payload: { name?: string; houseId?: string; requirePinOnPurchase?: boolean } = {};
    if (draft.name.trim() && draft.name !== current.name) payload.name = draft.name;
    if (isAdmin && draft.houseId && draft.houseId !== current.houseId) payload.houseId = draft.houseId;
    if (draft.requirePinOnPurchase !== current.requirePinOnPurchase) {
      payload.requirePinOnPurchase = draft.requirePinOnPurchase;
    }
    if (Object.keys(payload).length === 0) {
      setRowStatus((prev) => ({ ...prev, [userId]: "No changes" }));
      return;
    }

    const res = await fetch(`/api/manage/users/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setRowStatus((prev) => ({ ...prev, [userId]: body?.message ?? body?.error ?? "Failed" }));
      return;
    }
    setRowStatus((prev) => ({ ...prev, [userId]: "Saved" }));
    await refreshUsers();
  }

  async function toggleActive(user: UserRow) {
    setRowStatus((prev) => ({ ...prev, [user.id]: "" }));
    const res = await fetch(`/api/manage/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setRowStatus((prev) => ({ ...prev, [user.id]: body?.message ?? body?.error ?? "Failed" }));
      return;
    }
    setRowStatus((prev) => ({ ...prev, [user.id]: user.active ? "Archived" : "Restored" }));
    await refreshUsers();
  }

  async function setPin(userId: string) {
    const draft = drafts[userId];
    if (!draft) return;
    const pin = draft.pin.trim();
    if (!/^\d{4}$/.test(pin)) {
      setRowStatus((prev) => ({ ...prev, [userId]: "PIN must be exactly 4 digits" }));
      return;
    }
    setRowStatus((prev) => ({ ...prev, [userId]: "" }));
    const res = await fetch(`/api/admin/users/${userId}/pin`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin, pinRepeat: pin }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setRowStatus((prev) => ({ ...prev, [userId]: body?.message ?? body?.error ?? "Failed setting PIN" }));
      return;
    }
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], pin: "" } }));
    setRowStatus((prev) => ({ ...prev, [userId]: "PIN updated" }));
    await refreshUsers();
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-sm font-semibold">{isAdmin ? "Residents (admin)" : "Residents (minister)"}</div>
      <p className="mt-1 text-xs text-neutral-600">Manage resident names, active status, and PINs.</p>

      <div className="mt-3 space-y-2">
        <input
          className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
          placeholder="Search resident name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          {isAdmin ? (
            <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" value={houseId} onChange={(e) => setHouseId(e.target.value)}>
              <option value="">All houses</option>
              {houses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700">House: {me?.houseName ?? "…"}</div>
          )}
          <label className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            Include inactive
          </label>
        </div>
      </div>

      {status ? <div className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{status}</div> : null}
      {loading ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">Loading residents…</div>
      ) : users.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No residents found.</div>
      ) : (
        <ul className="mt-3 space-y-2">
          {users.map((user) => {
            const draft = drafts[user.id] ?? {
              name: user.name,
              houseId: user.houseId,
              pin: "",
              requirePinOnPurchase: user.requirePinOnPurchase,
            };
            return (
              <li key={user.id} className="rounded-xl border border-neutral-200 p-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{user.name}</div>
                    <div className="truncate text-xs text-neutral-600">
                      {user.house.name} · {user.active ? "active" : "inactive"} · pin: {user.hasPin ? "yes" : "no"} · purchase PIN:{" "}
                      {user.requirePinOnPurchase ? "on" : "off"}
                    </div>
                  </div>
                  <button type="button" className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold" onClick={() => void toggleActive(user)}>
                    {user.active ? "Archive" : "Restore"}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2">
                  <input
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                    value={draft.name}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, name: e.target.value } }))}
                  />
                  {isAdmin ? (
                    <select
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
                      value={draft.houseId}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, houseId: e.target.value } }))}
                    >
                      {houses.map((house) => (
                        <option key={house.id} value={house.id}>
                          {house.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>

                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.requirePinOnPurchase}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [user.id]: { ...draft, requirePinOnPurchase: e.target.checked },
                      }))
                    }
                  />
                  Ask for PIN on purchase
                </label>

                <button type="button" className="mt-2 w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white" onClick={() => void saveUser(user.id)}>
                  Save profile
                </button>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-sm tabular-nums"
                    value={draft.pin}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [user.id]: { ...draft, pin: e.target.value } }))}
                    placeholder="New 4-digit PIN"
                    inputMode="numeric"
                  />
                  <button type="button" className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => void setPin(user.id)}>
                    Set PIN
                  </button>
                </div>

                {rowStatus[user.id] ? <div className="mt-2 text-xs text-neutral-600">{rowStatus[user.id]}</div> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
