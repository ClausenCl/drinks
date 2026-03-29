import { useEffect, useMemo, useState } from "react";
import { useMe } from "./useMe";

type Member = { id: string; name: string };
type House = { id: string; name: string };

export function ManualChargeCreator() {
  const { me } = useMe();
  const [houses, setHouses] = useState<House[]>([]);
  const [houseId, setHouseId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    if (me.role === "ADMIN") {
      let cancelled = false;
      (async () => {
        const res = await fetch("/api/houses");
        if (!res.ok) return;
        const data = (await res.json()) as House[];
        if (cancelled) return;
        setHouses(data);
        if (data[0]) {
          setHouseId((current) => current || data[0].id);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    setHouseId(me.houseId);
  }, [me]);

  useEffect(() => {
    if (!houseId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/houses/${houseId}/members`);
      if (!res.ok) return;
      const data = (await res.json()) as Member[];
      if (cancelled) return;
      setMembers(data);
      if (!userId && data[0]) setUserId(data[0].id);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houseId]);

  const selectedName = useMemo(() => members.find((m) => m.id === userId)?.name ?? "", [members, userId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/manual-charges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, title, amount }),
    });
    if (!res.ok) {
      setStatus("Failed");
      return;
    }
    setTitle("");
    setAmount("");
    setStatus(`Added for ${selectedName}`);
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-sm font-semibold">Manual charge</div>
      <p className="mt-1 text-xs text-neutral-600">Add an extra amount to a user (not zero-sum).</p>
      <div className="mt-3 space-y-3">
        {me?.role === "ADMIN" ? (
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">House</div>
            <select
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base"
              value={houseId}
              onChange={(e) => {
                setHouseId(e.target.value);
                setUserId("");
              }}
            >
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block">
          <div className="mb-1 text-xs font-medium text-neutral-600">User</div>
          <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base" value={userId} onChange={(e) => setUserId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="mb-1 text-xs font-medium text-neutral-600">Title</div>
          <input className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Broken glass" />
        </label>
        <label className="block">
          <div className="mb-1 text-xs font-medium text-neutral-600">Amount (can be negative)</div>
          <input className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tabular-nums" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5.00" inputMode="decimal" />
        </label>
        {status ? <div className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{status}</div> : null}
        <button type="submit" className="w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white" disabled={!userId || !title.trim() || !amount.trim()}>
          Add
        </button>
      </div>
    </form>
  );
}
