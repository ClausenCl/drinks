import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { BillDetailsDialog } from "./BillDetailsDialog";
import { useMe } from "./useMe";

type House = { id: string; name: string };
type LedgerData = {
  user: {
    id: string;
    name: string;
    active: boolean;
    houseId: string;
    house: { id: string; name: string; color: string };
    requirePinOnPurchase: boolean;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    drinksTotal: string;
    billSharesTotal: string;
    manualChargesTotal: string;
    unbilledTotal: string;
  };
  drinks: {
    id: string;
    createdAt: string;
    quantity: number;
    unitPrice: string;
    total: string;
    billed: boolean;
    fridge: { id: string; name: string };
    itemName: string;
  }[];
  billShares: {
    id: string;
    billId: string;
    title: string;
    createdAt: string;
    shareAmount: string;
    billed: boolean;
  }[];
  manualCharges: {
    id: string;
    title: string;
    amount: string;
    createdAt: string;
    billed: boolean;
  }[];
  drinkOptions: { id: string; name: string; items: { id: string; name: string; price: string }[] }[];
};

export function ResidentWorkspace(props: { basePath: "/admin" | "/manager" }) {
  const router = useRouter();
  const { me } = useMe();
  const userId = typeof router.query.id === "string" ? router.query.id : "";
  const isAdmin = me?.role === "ADMIN";

  const [houses, setHouses] = useState<House[]>([]);
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "drinks" | "charges" | "bills">("overview");

  const [name, setName] = useState("");
  const [houseId, setHouseId] = useState("");
  const [active, setActive] = useState(true);
  const [requirePinOnPurchase, setRequirePinOnPurchase] = useState(false);
  const [pin, setPin] = useState("");

  const [drinkFridgeId, setDrinkFridgeId] = useState("");
  const [drinkItemId, setDrinkItemId] = useState("");
  const [drinkQuantity, setDrinkQuantity] = useState(1);

  const [chargeTitle, setChargeTitle] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [detailsBillId, setDetailsBillId] = useState("");

  const selectedFridge = useMemo(() => data?.drinkOptions.find((fridge) => fridge.id === drinkFridgeId) ?? null, [data?.drinkOptions, drinkFridgeId]);
  const canAddDrink = Boolean(drinkFridgeId && drinkItemId && (selectedFridge?.items.length ?? 0) > 0);

  async function loadWorkspace() {
    if (!userId) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/manage/users/${userId}/ledger`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        setStatus(body?.message ?? body?.error ?? "Could not load resident data.");
        setData(null);
        return;
      }
      const payload = (await res.json()) as LedgerData;
      setData(payload);
      setName(payload.user.name);
      setHouseId(payload.user.houseId);
      setActive(payload.user.active);
      setRequirePinOnPurchase(payload.user.requirePinOnPurchase);
      const firstFridgeId = payload.drinkOptions[0]?.id ?? "";
      const firstItemId = payload.drinkOptions[0]?.items[0]?.id ?? "";
      setDrinkFridgeId((current) => (current && payload.drinkOptions.some((fridge) => fridge.id === current) ? current : firstFridgeId));
      setDrinkItemId((current) =>
        current && payload.drinkOptions.some((fridge) => fridge.items.some((item) => item.id === current)) ? current : firstItemId
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/houses");
      if (!res.ok) return;
      const payload = (await res.json()) as House[];
      if (!cancelled) setHouses(payload);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!selectedFridge) return;
    if (selectedFridge.items.some((item) => item.id === drinkItemId)) return;
    setDrinkItemId(selectedFridge.items[0]?.id ?? "");
  }, [drinkItemId, selectedFridge]);

  async function saveProfile() {
    if (!data || !userId) return;
    setStatus(null);
    const payload: { name?: string; houseId?: string; active?: boolean; requirePinOnPurchase?: boolean } = {};
    if (name.trim() && name !== data.user.name) payload.name = name.trim();
    if (active !== data.user.active) payload.active = active;
    if (requirePinOnPurchase !== data.user.requirePinOnPurchase) payload.requirePinOnPurchase = requirePinOnPurchase;
    if (isAdmin && houseId && houseId !== data.user.houseId) payload.houseId = houseId;
    if (Object.keys(payload).length === 0) {
      setStatus("No profile changes.");
      return;
    }

    const res = await fetch(`/api/manage/users/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Profile update failed.");
      return;
    }
    setStatus("Profile saved.");
    await loadWorkspace();
  }

  async function setPinForUser() {
    if (!userId) return;
    const pinValue = pin.trim();
    if (!/^\d{4}$/.test(pinValue)) {
      setStatus("PIN must be exactly 4 digits.");
      return;
    }
    setStatus(null);
    const res = await fetch(`/api/admin/users/${userId}/pin`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin: pinValue, pinRepeat: pinValue }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "PIN update failed.");
      return;
    }
    setPin("");
    setStatus("PIN updated.");
  }

  async function addDrinkEntry() {
    if (!userId || !drinkFridgeId || !drinkItemId) return;
    setStatus(null);
    const res = await fetch(`/api/manage/users/${userId}/drinks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fridgeId: drinkFridgeId, fridgeItemId: drinkItemId, quantity: Math.max(1, Math.min(99, drinkQuantity)) }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Could not add drink entry.");
      return;
    }
    setStatus("Drink entry added.");
    await loadWorkspace();
  }

  async function deleteDrinkEntry(entryId: string) {
    if (!userId) return;
    if (!window.confirm("Delete this drink entry?")) return;
    const reason = window.prompt("Optional reason:", "") ?? "";
    setStatus(null);
    const res = await fetch(`/api/manage/users/${userId}/drinks/${entryId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Could not delete drink entry.");
      return;
    }
    setStatus("Drink entry deleted.");
    await loadWorkspace();
  }

  async function addManualCharge() {
    if (!userId) return;
    setStatus(null);
    const res = await fetch(`/api/manage/users/${userId}/manual-charges`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: chargeTitle, amount: chargeAmount }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Could not add manual charge.");
      return;
    }
    setChargeTitle("");
    setChargeAmount("");
    setStatus("Manual charge added.");
    await loadWorkspace();
  }

  async function deleteManualCharge(chargeId: string) {
    if (!userId) return;
    if (!window.confirm("Delete this manual charge?")) return;
    setStatus(null);
    const res = await fetch(`/api/manage/users/${userId}/manual-charges/${chargeId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Could not delete manual charge.");
      return;
    }
    setStatus("Manual charge deleted.");
    await loadWorkspace();
  }

  if (loading) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">Loading resident workspace…</div>;
  }

  if (!data) {
    return <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">{status ?? "Resident not accessible."}</div>;
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm"
        onClick={() => void router.push(`${props.basePath}/residents`)}
      >
        ← Back to residents
      </button>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold">{data.user.name}</div>
        <div className="mt-1 text-xs text-neutral-600">{data.user.house.name}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2">
            <div className="text-neutral-500">Unbilled total</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">{data.summary.unbilledTotal} EUR</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2">
            <div className="text-neutral-500">Drinks total</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">{data.summary.drinksTotal} EUR</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2">
            <div className="text-neutral-500">Manual charges</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">{data.summary.manualChargesTotal} EUR</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2">
            <div className="text-neutral-500">Bill shares</div>
            <div className="mt-1 text-sm font-semibold tabular-nums">{data.summary.billSharesTotal} EUR</div>
          </div>
        </div>
      </div>

      {status ? <div className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white">{status}</div> : null}

      <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            ["overview", "Overview"],
            ["drinks", "Drinks"],
            ["charges", "Manual charges"],
            ["bills", "Bill shares"],
          ].map(([tabId, label]) => {
            const activeTab = tab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                onClick={() => setTab(tabId as typeof tab)}
                className={[
                  "shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition active:scale-[0.98]",
                  activeTab ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-100",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">Profile</div>
            <div className="mt-3 space-y-2">
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm" value={name} onChange={(event) => setName(event.target.value)} />
              {isAdmin ? (
                <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm" value={houseId} onChange={(event) => setHouseId(event.target.value)}>
                  {houses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
                Active resident
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={requirePinOnPurchase}
                  onChange={(event) => setRequirePinOnPurchase(event.target.checked)}
                />
                Ask PIN immediately after resident selection
              </label>
              <button type="button" className="w-full rounded-xl bg-black px-3 py-3 text-sm font-semibold text-white" onClick={() => void saveProfile()}>
                Save profile
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">PIN reset</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                className="rounded-xl border border-neutral-200 px-3 py-3 text-sm tabular-nums"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="New 4-digit PIN"
                inputMode="numeric"
              />
              <button type="button" className="rounded-xl bg-neutral-900 px-3 py-3 text-sm font-semibold text-white" onClick={() => void setPinForUser()}>
                Set PIN
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "drinks" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">Add drink entry</div>
            {data.drinkOptions.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                No drink options available for this account scope.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm" value={drinkFridgeId} onChange={(event) => setDrinkFridgeId(event.target.value)}>
                  {data.drinkOptions.map((fridge) => (
                    <option key={fridge.id} value={fridge.id}>
                      {fridge.name}
                    </option>
                  ))}
                </select>
                <select className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm" value={drinkItemId} onChange={(event) => setDrinkItemId(event.target.value)}>
                  {(selectedFridge?.items ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.price} EUR
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm tabular-nums"
                  type="number"
                  min={1}
                  max={99}
                  value={drinkQuantity}
                  onChange={(event) => setDrinkQuantity(Number.parseInt(event.target.value || "1", 10))}
                />
                <button
                  type="button"
                  disabled={!canAddDrink}
                  className="w-full rounded-xl bg-black px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={() => void addDrinkEntry()}
                >
                  Add drink
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {data.drinks.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {entry.quantity}× {entry.itemName}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-neutral-600">
                      {entry.fridge.name} · {new Date(entry.createdAt).toLocaleString()} · {entry.billed ? "invoiced" : "not invoiced"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums text-xs font-semibold">{entry.total} EUR</div>
                    <button
                      type="button"
                      className="mt-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                      onClick={() => void deleteDrinkEntry(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {data.drinks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No drink entries yet.</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "charges" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold">Add manual charge</div>
            <div className="mt-3 space-y-2">
              <input
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm"
                value={chargeTitle}
                onChange={(event) => setChargeTitle(event.target.value)}
                placeholder="Title"
              />
              <input
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm tabular-nums"
                value={chargeAmount}
                onChange={(event) => setChargeAmount(event.target.value)}
                placeholder="Amount (e.g. 4.50 or -2.00)"
                inputMode="decimal"
              />
              <button type="button" className="w-full rounded-xl bg-black px-3 py-3 text-sm font-semibold text-white" onClick={() => void addManualCharge()}>
                Add manual charge
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {data.manualCharges.map((charge) => (
              <div key={charge.id} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{charge.title}</div>
                    <div className="mt-0.5 truncate text-xs text-neutral-600">
                      {new Date(charge.createdAt).toLocaleString()} · {charge.billed ? "invoiced" : "not invoiced"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums text-xs font-semibold">{charge.amount} EUR</div>
                    {!charge.billed ? (
                      <button
                        type="button"
                        className="mt-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                        onClick={() => void deleteManualCharge(charge.id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {data.manualCharges.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No manual charges yet.</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "bills" ? (
        <div className="space-y-2">
          {data.billShares.map((share) => (
            <div key={share.id} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{share.title}</div>
                  <div className="mt-0.5 truncate text-xs text-neutral-600">
                    {new Date(share.createdAt).toLocaleString()} · {share.billed ? "invoiced" : "not invoiced"}
                  </div>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold"
                    onClick={() => setDetailsBillId(share.billId)}
                  >
                    Details
                  </button>
                  <div className="mt-1 tabular-nums text-xs font-semibold">{share.shareAmount} EUR</div>
                </div>
              </div>
            </div>
          ))}
          {data.billShares.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No bill shares yet.</div>
          ) : null}
        </div>
      ) : null}
      {detailsBillId ? <BillDetailsDialog billId={detailsBillId} onClose={() => setDetailsBillId("")} /> : null}
    </div>
  );
}
