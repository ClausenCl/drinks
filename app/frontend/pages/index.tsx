import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

type House = { id: string; name: string; color: string };

export default function IndexPage() {
  const router = useRouter();
  const next = useMemo(() => (typeof router.query.next === "string" ? router.query.next : ""), [router.query.next]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loadingHouses, setLoadingHouses] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/houses");
        if (!res.ok) return;
        const data = (await res.json()) as House[];
        if (!cancelled) setHouses(data);
      } finally {
        if (!cancelled) setLoadingHouses(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-100 px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drinks</h1>
          <p className="mt-1 text-sm text-neutral-600">Choose your house to continue.</p>
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Resident</div>
          <p className="mt-1 text-xs text-neutral-600">Pick your house, then your name.</p>
          <div className="mt-3 space-y-2">
            {loadingHouses ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                Loading houses…
              </div>
            ) : null}
            {houses.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => void router.push({ pathname: `/house/${h.id}`, query: next ? { next } : {} })}
                className="w-full rounded-xl px-4 py-4 text-left text-base font-semibold text-white shadow-sm transition hover:brightness-95"
                style={{ backgroundColor: h.color || "#111827" }}
              >
                {h.name}
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href={next ? { pathname: "/admin-login", query: { next } } : "/admin-login"} className="text-xs underline text-neutral-700">
              Admin / Getränkeminister login
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
