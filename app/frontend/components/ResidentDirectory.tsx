import Link from "next/link";
import { useEffect, useState } from "react";
import { useMe } from "./useMe";

type House = { id: string; name: string };
type UserRow = {
  id: string;
  name: string;
  houseId: string;
  house: { id: string; name: string };
  active: boolean;
  requirePinOnPurchase: boolean;
};

export function ResidentDirectory(props: { basePath: "/admin" | "/manager" }) {
  const { me } = useMe();
  const isAdmin = me?.role === "ADMIN";

  const [houses, setHouses] = useState<House[]>([]);
  const [houseId, setHouseId] = useState("");
  const [query, setQuery] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/houses");
      if (!res.ok) return;
      const data = (await res.json()) as House[];
      if (!cancelled) setHouses(data);
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
        params.set("take", "300");
        if (query.trim()) params.set("q", query.trim());
        if (includeInactive) params.set("includeInactive", "true");
        if (isAdmin && houseId) params.set("houseId", houseId);
        const res = await fetch(`/api/manage/users?${params.toString()}`);
        if (!res.ok) {
          if (!cancelled) setStatus("Could not load residents.");
          return;
        }
        const data = (await res.json()) as UserRow[];
        if (!cancelled) setUsers(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [houseId, includeInactive, isAdmin, query]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold">Residents</div>
        <p className="mt-1 text-xs text-neutral-600">Select a resident to open full detail workspace and ledger actions.</p>
        <div className="mt-3 space-y-2">
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm"
            placeholder="Search resident name…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            {isAdmin ? (
              <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm" value={houseId} onChange={(event) => setHouseId(event.target.value)}>
                <option value="">All houses</option>
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-neutral-200 px-3 py-3 text-sm text-neutral-700">House: {me?.houseName ?? "—"}</div>
            )}
            <label className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-3 text-sm">
              <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
              Include inactive
            </label>
          </div>
        </div>
      </div>

      {status ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{status}</div> : null}
      {loading ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">Loading residents…</div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">No residents found.</div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`${props.basePath}/residents/${user.id}`}
              className="block rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition hover:bg-neutral-50 active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{user.name}</div>
                  <div className="mt-0.5 truncate text-xs text-neutral-600">
                    {user.house.name} · {user.active ? "active" : "inactive"} · immediate PIN {user.requirePinOnPurchase ? "on" : "off"}
                  </div>
                </div>
                <div className="shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold">Open</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
