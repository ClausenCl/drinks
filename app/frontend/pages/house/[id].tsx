import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

type Member = { id: string; name: string; requirePinOnPurchase: boolean };
type House = { id: string; name: string };

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export default function HouseMembersPage() {
  const router = useRouter();
  const houseId = typeof router.query.id === "string" ? router.query.id : null;
  const next = useMemo(() => (typeof router.query.next === "string" ? router.query.next : ""), [router.query.next]);

  const [house, setHouse] = useState<House | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinRepeat, setNewPinRepeat] = useState("");
  const [newRequirePinOnPurchase, setNewRequirePinOnPurchase] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [pinFor, setPinFor] = useState<Member | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    if (!houseId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [housesRes, membersRes] = await Promise.all([fetch("/api/houses"), fetch(`/api/houses/${houseId}/members`)]);
        if (housesRes.ok) {
          const data = (await housesRes.json()) as House[];
          if (!cancelled) setHouse(data.find((h) => h.id === houseId) ?? null);
        }
        if (membersRes.ok) {
          const data = (await membersRes.json()) as Member[];
          if (!cancelled) setMembers(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [houseId]);

  const filtered = members.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));

  async function login(member: Member, pinValue: string) {
    const res = await fetch("/api/auth/resident", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: member.id, pin: pinValue }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      return body?.error ?? body?.message ?? "LOGIN_FAILED";
    }
    await router.push(next || "/menu");
    return null;
  }

  async function onPick(member: Member) {
    setPickError(null);
    if (member.requirePinOnPurchase) {
      setPinFor(member);
      setPin("");
      setPinError(null);
      return;
    }

    const error = await login(member, "");
    if (!error) return;
    if (error === "PIN_REQUIRED_SETUP") {
      setPickError("PIN setup required. Ask an admin/minister.");
      return;
    }
    setPickError("Login failed. Try again.");
  }

  async function onSubmitPin(e: React.FormEvent) {
    e.preventDefault();
    if (!pinFor) return;
    setPinError(null);
    setPinLoading(true);
    try {
      const error = await login(pinFor, pin);
      if (!error) return;
      if (error === "PIN_REQUIRED_SETUP") {
        setPinError("PIN setup required. Ask an admin/minister.");
        return;
      }
      setPinError("Wrong PIN");
    } finally {
      setPinLoading(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!houseId) return;
    setCreateError(null);
    const name = normalizeName(newName);
    if (!name) {
      setCreateError("Please enter a name.");
      return;
    }
    const res = await fetch(`/api/houses/${houseId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, pin: newPin, pinRepeat: newPinRepeat, requirePinOnPurchase: newRequirePinOnPurchase }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setCreateError(body?.message ?? body?.error ?? "CREATE_FAILED");
      return;
    }
    setNewName("");
    setNewPin("");
    setNewPinRepeat("");
    setNewRequirePinOnPurchase(false);
    setCreating(false);
    const listRes = await fetch(`/api/houses/${houseId}/members`);
    if (listRes.ok) setMembers((await listRes.json()) as Member[]);
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-md space-y-5">
        <button type="button" className="text-sm text-neutral-700 underline" onClick={() => void router.push({ pathname: "/", query: next ? { next } : {} })}>
          ← Back
        </button>

        <div>
          <h1 className="text-2xl font-bold">{house?.name ?? "House"}</h1>
          <p className="mt-1 text-sm text-neutral-600">Select your name. If you’re new, add yourself.</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Search</div>
            <input
              className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name…"
            />
          </label>

          <div className="mt-4 space-y-2">
            {loading ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                Loading members…
              </div>
            ) : null}
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => void onPick(m)}
                className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3 text-left"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{m.name}</div>
                </div>
                <div className="text-sm text-neutral-500">→</div>
              </button>
            ))}
            {!loading && filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                No matching members.
              </div>
            ) : null}
            {pickError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{pickError}</div> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <button type="button" className="text-sm font-semibold underline" onClick={() => setCreating((v) => !v)}>
            {creating ? "Hide" : "New member"}
          </button>
          {creating ? (
            <form onSubmit={onCreate} className="mt-3 space-y-3">
              <div className="text-xs text-neutral-600">
                Please choose a clear, recognizable name (preferably first and last name).
              </div>
              <label className="block">
                <div className="mb-1 text-xs font-medium text-neutral-600">Name</div>
                <input
                  className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Max Mustermann"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <div className="mb-1 text-xs font-medium text-neutral-600">4-digit PIN (required)</div>
                  <input
                    className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tabular-nums"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="1234"
                    inputMode="numeric"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs font-medium text-neutral-600">Repeat PIN</div>
                  <input
                    className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tabular-nums"
                    value={newPinRepeat}
                    onChange={(e) => setNewPinRepeat(e.target.value)}
                    placeholder="1234"
                    inputMode="numeric"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newRequirePinOnPurchase}
                  onChange={(e) => setNewRequirePinOnPurchase(e.target.checked)}
                />
                Ask for PIN right after selecting the name
              </label>

              {createError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{createError}</div> : null}

              <button type="submit" className="w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white">
                Create member
              </button>
            </form>
          ) : null}
        </div>

        {pinFor ? (
          <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4">
              <div className="text-sm font-semibold">Enter PIN</div>
              <div className="mt-1 text-xs text-neutral-600">{pinFor.name}</div>
              <form onSubmit={onSubmitPin} className="mt-3 space-y-3">
                <input
                  className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-xl tabular-nums tracking-widest"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  inputMode="numeric"
                  autoFocus
                />
                {pinError ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{pinError}</div> : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="w-1/3 rounded-xl bg-neutral-100 px-4 py-3 text-base font-semibold"
                    onClick={() => setPinFor(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pinLoading || pin.length !== 4}
                    className="w-2/3 rounded-xl bg-black px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
                  >
                    {pinLoading ? "Checking…" : "Continue"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
