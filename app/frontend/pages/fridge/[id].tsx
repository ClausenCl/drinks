import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AppShell } from "../../components/AppShell";
import { ProductButton } from "../../components/ProductButton";

type FridgeDetails = {
  id: string;
  name: string;
  products: { id: string; name: string; price: string }[];
};

export default function FridgePage() {
  const router = useRouter();
  const fridgeId = typeof router.query.id === "string" ? router.query.id : null;
  const [data, setData] = useState<FridgeDetails | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!fridgeId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/fridges/${fridgeId}`);
      if (!res.ok) return;
      const json = (await res.json()) as FridgeDetails;
      if (!cancelled) setData(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [fridgeId]);

  async function logDrink(productId: string) {
    if (!fridgeId) return;
    const res = await fetch("/api/drinks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fridgeId, productId, quantity: 1 }),
    });
    setToast(res.ok ? "Logged" : "Failed");
    window.setTimeout(() => setToast(null), 1200);
  }

  return (
    <AppShell title={data?.name ?? "Fridge"}>
      {toast ? <div className="mb-3 rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white">{toast}</div> : null}
      <div className="space-y-3">
        {(data?.products ?? []).map((p) => (
          <ProductButton key={p.id} name={p.name} price={`${p.price} EUR`} onClick={() => void logDrink(p.id)} />
        ))}
        {!data ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">Loading fridge...</div>
        ) : null}
      </div>
    </AppShell>
  );
}

