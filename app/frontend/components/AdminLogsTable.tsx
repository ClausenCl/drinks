import { useEffect, useState } from "react";

type House = { id: string; name: string };
type Fridge = { id: string; name: string };
type Minister = { id: string; name: string; loginName: string | null; houseId: string; createdAt: string };

export function AdminLogsTable() {
  const [houses, setHouses] = useState<House[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [ministers, setMinisters] = useState<Minister[]>([]);

  const [houseName, setHouseName] = useState("");
  const [houseStatus, setHouseStatus] = useState<string | null>(null);

  const [mName, setMName] = useState("");
  const [mLogin, setMLogin] = useState("");
  const [mPassword, setMPassword] = useState("");
  const [mHouseId, setMHouseId] = useState("");
  const [mFridgeIds, setMFridgeIds] = useState<Record<string, boolean>>({});
  const [mStatus, setMStatus] = useState<string | null>(null);

  const [selectedMinisterId, setSelectedMinisterId] = useState<string>("");
  const [permStatus, setPermStatus] = useState<string | null>(null);
  const [permIds, setPermIds] = useState<Record<string, boolean>>({});

  async function refresh() {
    const [hRes, fRes, mRes] = await Promise.all([fetch("/api/houses"), fetch("/api/admin/fridges"), fetch("/api/admin/ministers")]);
    if (hRes.ok) {
      const data = (await hRes.json()) as House[];
      setHouses(data);
      if (!mHouseId && data[0]) setMHouseId(data[0].id);
    }
    if (fRes.ok) {
      const data = (await fRes.json()) as Fridge[];
      setFridges(data);
      setMFridgeIds(Object.fromEntries(data.map((f) => [f.id, true]))); // default all selected
    }
    if (mRes.ok) {
      const data = (await mRes.json()) as Minister[];
      setMinisters(data);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createHouse(e: React.FormEvent) {
    e.preventDefault();
    setHouseStatus(null);
    const res = await fetch("/api/houses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: houseName }),
    });
    if (!res.ok) {
      setHouseStatus("Failed");
      return;
    }
    setHouseName("");
    setHouseStatus("Created");
    await refresh();
  }

  async function createMinister(e: React.FormEvent) {
    e.preventDefault();
    setMStatus(null);
    const fridgeIds = Object.entries(mFridgeIds)
      .filter(([, v]) => v)
      .map(([id]) => id);
    const res = await fetch("/api/admin/ministers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: mName, loginName: mLogin, password: mPassword, houseId: mHouseId, fridgeIds }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setMStatus(body?.message ?? body?.error ?? "Failed");
      return;
    }
    setMName("");
    setMLogin("");
    setMPassword("");
    setMStatus("Created");
    await refresh();
  }

  async function loadPerms(id: string) {
    setPermStatus(null);
    setSelectedMinisterId(id);
    const res = await fetch(`/api/admin/ministers/${id}/fridges`);
    if (!res.ok) return;
    const allowed = (await res.json()) as string[];
    const next = Object.fromEntries(fridges.map((f) => [f.id, allowed.includes(f.id)]));
    setPermIds(next);
  }

  async function savePerms() {
    if (!selectedMinisterId) return;
    setPermStatus(null);
    const fridgeIds = Object.entries(permIds)
      .filter(([, v]) => v)
      .map(([id]) => id);
    const res = await fetch(`/api/admin/ministers/${selectedMinisterId}/fridges`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fridgeIds }),
    });
    setPermStatus(res.ok ? "Saved" : "Failed");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createHouse} className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">Create house</div>
        <div className="mt-3 flex gap-2">
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
            value={houseName}
            onChange={(e) => setHouseName(e.target.value)}
            placeholder="e.g. Externals"
          />
          <button type="submit" className="shrink-0 rounded-xl bg-black px-4 py-3 text-base font-semibold text-white" disabled={!houseName.trim()}>
            Create
          </button>
        </div>
        {houseStatus ? <div className="mt-2 text-sm text-neutral-700">{houseStatus}</div> : null}
      </form>

      <form onSubmit={createMinister} className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">Create Getränkeminister</div>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Display name</div>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base" value={mName} onChange={(e) => setMName(e.target.value)} />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Login name</div>
            <input
              className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
              value={mLogin}
              onChange={(e) => setMLogin(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Password</div>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base" value={mPassword} onChange={(e) => setMPassword(e.target.value)} type="password" />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">House</div>
            <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base" value={mHouseId} onChange={(e) => setMHouseId(e.target.value)}>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <div className="mb-2 text-xs font-medium text-neutral-600">Allowed fridges</div>
            <div className="space-y-2">
              {fridges.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(mFridgeIds[f.id])}
                    onChange={(e) => setMFridgeIds((prev) => ({ ...prev, [f.id]: e.target.checked }))}
                  />
                  <span>{f.name}</span>
                </label>
              ))}
            </div>
          </div>

          {mStatus ? <div className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{mStatus}</div> : null}

          <button type="submit" className="w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white" disabled={!mName.trim() || !mLogin.trim() || !mPassword}>
            Create minister
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">Minister fridge permissions</div>
        <div className="mt-3 space-y-2">
          <select
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base"
            value={selectedMinisterId}
            onChange={(e) => void loadPerms(e.target.value)}
          >
            <option value="" disabled>
              Select minister…
            </option>
            {ministers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.loginName ?? "no login"})
              </option>
            ))}
          </select>

          {selectedMinisterId ? (
            <div className="mt-2 space-y-2">
              {fridges.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(permIds[f.id])}
                    onChange={(e) => setPermIds((prev) => ({ ...prev, [f.id]: e.target.checked }))}
                  />
                  <span>{f.name}</span>
                </label>
              ))}
              <button type="button" onClick={() => void savePerms()} className="mt-2 w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white">
                Save permissions
              </button>
              {permStatus ? <div className="mt-2 text-sm text-neutral-700">{permStatus}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
