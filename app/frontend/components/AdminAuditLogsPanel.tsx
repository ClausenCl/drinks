import { useEffect, useMemo, useState } from "react";

type House = { id: string; name: string };
type UserOption = { id: string; name: string; role: "ADMIN" | "GETRAENKEMINISTER" | "BEWOHNER"; house: { id: string; name: string } };
type LogRow = {
  id: string;
  type: "DRINK_ADDED" | "DRINK_DELETED" | "USER_DELETED" | "PRICE_CHANGED";
  userId: string;
  userName: string;
  userRole: "ADMIN" | "GETRAENKEMINISTER" | "BEWOHNER";
  userHouse: { id: string; name: string };
  metadata: unknown;
  createdAt: string;
};

export function AdminAuditLogsPanel() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const [type, setType] = useState("");
  const [houseId, setHouseId] = useState("");
  const [userId, setUserId] = useState("");
  const [take, setTake] = useState("100");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [houseRes, usersRes] = await Promise.all([fetch("/api/houses"), fetch("/api/users?includeInactive=true&take=200")]);
      if (houseRes.ok && !cancelled) {
        setHouses((await houseRes.json()) as House[]);
      }
      if (usersRes.ok && !cancelled) {
        const allUsers = (await usersRes.json()) as UserOption[];
        setUsers(allUsers);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        const params = new URLSearchParams();
        if (type) params.set("type", type);
        if (houseId) params.set("houseId", houseId);
        if (userId) params.set("userId", userId);
        if (take.trim()) params.set("take", take.trim());
        const res = await fetch(`/api/logs?${params.toString()}`);
        if (!res.ok) {
          if (!cancelled) setStatus("Failed loading logs");
          return;
        }
        const data = (await res.json()) as LogRow[];
        if (!cancelled) setLogs(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [houseId, take, type, userId]);

  const usersForHouse = useMemo(
    () => (houseId ? users.filter((user) => user.house.id === houseId) : users),
    [houseId, users]
  );

  function metadataText(value: unknown) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-sm font-semibold">Audit logs (admin)</div>
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All log types</option>
            <option value="DRINK_ADDED">Drink added</option>
            <option value="DRINK_DELETED">Drink deleted</option>
            <option value="PRICE_CHANGED">Price changed</option>
            <option value="USER_DELETED">User deleted</option>
          </select>
          <select
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"
            value={houseId}
            onChange={(e) => {
              setHouseId(e.target.value);
              setUserId("");
            }}
          >
            <option value="">All houses</option>
            {houses.map((house) => (
              <option key={house.id} value={house.id}>
                {house.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All users</option>
            {usersForHouse.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            value={take}
            onChange={(e) => setTake(e.target.value)}
            inputMode="numeric"
            placeholder="take (e.g. 100)"
          />
        </div>
      </div>

      {status ? <div className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{status}</div> : null}
      {loading ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">Loading logs…</div>
      ) : logs.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No logs found.</div>
      ) : (
        <ul className="mt-3 space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="rounded-xl border border-neutral-200 p-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0 truncate font-semibold">{log.type}</div>
                <div className="shrink-0 text-xs text-neutral-500">{new Date(log.createdAt).toLocaleString()}</div>
              </div>
              <div className="mt-1 text-xs text-neutral-600">
                {log.userName} · {log.userRole} · {log.userHouse.name}
              </div>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-2 text-[11px] text-neutral-700">{metadataText(log.metadata)}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
