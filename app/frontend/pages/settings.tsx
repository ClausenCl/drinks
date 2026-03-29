import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { useMe } from "../components/useMe";

type House = { id: string; name: string };

export default function SettingsPage() {
  const { me, loading } = useMe();
  const router = useRouter();

  const [houses, setHouses] = useState<House[]>([]);
  const [housesLoading, setHousesLoading] = useState(true);

  const [name, setName] = useState("");
  const [nameStatus, setNameStatus] = useState<string | null>(null);

  const [houseId, setHouseId] = useState<string>("");
  const [houseStatus, setHouseStatus] = useState<string | null>(null);

  const [pin, setPin] = useState("");
  const [pinRepeat, setPinRepeat] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [pinStatus, setPinStatus] = useState<string | null>(null);

  const [requirePinOnPurchase, setRequirePinOnPurchase] = useState(false);

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "BEWOHNER") void router.replace(me.role === "ADMIN" ? "/admin" : "/manager");
  }, [loading, me, router]);

  useEffect(() => {
    if (!me) return;
    setName(me.name);
    setHouseId(me.houseId);
    setRequirePinOnPurchase(Boolean(me.requirePinOnPurchase));
  }, [me]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/houses");
        if (!res.ok) return;
        const data = (await res.json()) as House[];
        if (!cancelled) setHouses(data);
      } finally {
        if (!cancelled) setHousesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameStatus(null);
    const res = await fetch("/api/users/me/name", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setNameStatus(body?.message ?? body?.error ?? "FAILED");
      return;
    }
    setNameStatus("Saved");
  }

  async function saveHouse(e: React.FormEvent) {
    e.preventDefault();
    setHouseStatus(null);
    const res = await fetch("/api/users/me/house", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ houseId }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setHouseStatus(body?.message ?? body?.error ?? "FAILED");
      return;
    }
    setHouseStatus("Saved");
  }

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    setPinStatus(null);
    const res = await fetch("/api/users/me/pin", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "updateSecurity", currentPin, pin, pinRepeat, requirePinOnPurchase }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setPinStatus(body?.message ?? body?.error ?? "FAILED");
      return;
    }
    setCurrentPin("");
    setPin("");
    setPinRepeat("");
    setPinStatus("Saved");
  }

  return (
    <AppShell title="Settings">
      <div className="space-y-4">
        <form onSubmit={saveName} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="text-sm font-semibold">Name</div>
          <p className="mt-1 text-xs text-neutral-600">Must be unique in your house. Change it before moving if needed.</p>
          <label className="mt-3 block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Display name</div>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {nameStatus ? <div className="mt-3 text-sm text-neutral-700">{nameStatus}</div> : null}
          <button type="submit" className="mt-3 w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white">
            Save name
          </button>
        </form>

        <form onSubmit={saveHouse} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="text-sm font-semibold">House</div>
          <p className="mt-1 text-xs text-neutral-600">
            If your name already exists in the destination house, you must change your name first.
          </p>
          <label className="mt-3 block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Select house</div>
            <select
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base"
              value={houseId}
              disabled={housesLoading}
              onChange={(e) => setHouseId(e.target.value)}
            >
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          {houseStatus ? <div className="mt-3 text-sm text-neutral-700">{houseStatus}</div> : null}
          <button type="submit" className="mt-3 w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white">
            Save house
          </button>
        </form>

        <form onSubmit={savePin} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="text-sm font-semibold">PIN & access timing</div>
          <p className="mt-1 text-xs text-neutral-600">Change PIN and choose when PIN is asked (right after name selection or only when opening menu area).</p>
          <div className="mt-3 space-y-2">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Current PIN</div>
              <input
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tabular-nums"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="1234"
                inputMode="numeric"
              />
            </label>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requirePinOnPurchase}
              onChange={(e) => setRequirePinOnPurchase(e.target.checked)}
            />
            Ask PIN immediately after selecting name
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">New 4-digit PIN (optional)</div>
              <input
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tabular-nums"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1234"
                inputMode="numeric"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Repeat PIN</div>
              <input
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tabular-nums"
                value={pinRepeat}
                onChange={(e) => setPinRepeat(e.target.value)}
                placeholder="1234"
                inputMode="numeric"
              />
            </label>
          </div>
          {pinStatus ? <div className="mt-3 text-sm text-neutral-700">{pinStatus}</div> : null}
          <button type="submit" className="mt-3 w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white">
            Save security settings
          </button>
        </form>
      </div>
    </AppShell>
  );
}
