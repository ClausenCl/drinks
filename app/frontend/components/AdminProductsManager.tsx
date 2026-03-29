import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: string;
  active: boolean;
  createdAt: string;
};

type Draft = { name: string; price: string; active: boolean };

export function AdminProductsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, string>>({});

  const [createName, setCreateName] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [createActive, setCreateActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("includeInactive", "true");
        if (query.trim()) params.set("q", query.trim());
        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) {
          if (!cancelled) setStatus("Failed loading products");
          return;
        }
        const data = (await res.json()) as Product[];
        if (cancelled) return;
        setProducts(data);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const product of data) {
            next[product.id] ??= {
              name: product.name,
              price: product.price,
              active: product.active,
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
  }, [query]);

  async function refresh() {
    const params = new URLSearchParams();
    params.set("includeInactive", "true");
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/products?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as Product[];
    setProducts(data);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const product of data) {
        next[product.id] ??= {
          name: product.name,
          price: product.price,
          active: product.active,
        };
      }
      return next;
    });
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: createName,
        price: createPrice,
        active: createActive,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setStatus(body?.message ?? body?.error ?? "Failed creating product");
      return;
    }
    setCreateName("");
    setCreatePrice("");
    setCreateActive(true);
    setStatus("Product created");
    await refresh();
  }

  async function saveProduct(productId: string) {
    const draft = drafts[productId];
    if (!draft) return;
    setRowStatus((prev) => ({ ...prev, [productId]: "" }));
    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        price: draft.price,
        active: draft.active,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      setRowStatus((prev) => ({ ...prev, [productId]: body?.message ?? body?.error ?? "Failed" }));
      return;
    }
    setRowStatus((prev) => ({ ...prev, [productId]: "Saved" }));
    await refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createProduct} className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">Products (admin)</div>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Name</div>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base" value={createName} onChange={(e) => setCreateName(e.target.value)} />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Price (EUR)</div>
            <input
              className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tabular-nums"
              value={createPrice}
              onChange={(e) => setCreatePrice(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 1.50"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={createActive} onChange={(e) => setCreateActive(e.target.checked)} />
            Active
          </label>
          {status ? <div className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{status}</div> : null}
          <button type="submit" className="w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white" disabled={!createName.trim() || !createPrice.trim()}>
            Create product
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm font-semibold">Edit products</div>
        <div className="mt-3">
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            placeholder="Filter products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">No products found.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {products.map((product) => {
              const draft = drafts[product.id] ?? {
                name: product.name,
                price: product.price,
                active: product.active,
              };
              return (
                <div key={product.id} className="rounded-xl border border-neutral-200 p-3">
                  <div className="text-xs text-neutral-600">{new Date(product.createdAt).toLocaleString()}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                      value={draft.name}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [product.id]: { ...draft, name: e.target.value } }))}
                    />
                    <input
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-sm tabular-nums"
                      value={draft.price}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [product.id]: { ...draft, price: e.target.value } }))}
                      inputMode="decimal"
                    />
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [product.id]: { ...draft, active: e.target.checked } }))}
                    />
                    Active
                  </label>
                  <button type="button" className="mt-2 w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white" onClick={() => void saveProduct(product.id)}>
                    Save
                  </button>
                  {rowStatus[product.id] ? <div className="mt-2 text-xs text-neutral-600">{rowStatus[product.id]}</div> : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
