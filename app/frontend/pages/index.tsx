import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

type House = { id: string; name: string };

export default function IndexPage() {
  const router = useRouter();
  const next = useMemo(() => (typeof router.query.next === "string" ? router.query.next : ""), [router.query.next]);
  const [houses, setHouses] = useState<House[]>([]);
  const [loadingHouses, setLoadingHouses] = useState(true);

  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

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

  async function onAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ loginName, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setAdminError(body?.error ?? "LOGIN_FAILED");
        return;
      }
      const me = (await res.json()) as { role: "ADMIN" | "GETRAENKEMINISTER" | "BEWOHNER" };
      await router.push(me.role === "ADMIN" ? "/admin" : "/manager");
    } finally {
      setAdminLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-md space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Drinks</h1>
          <p className="mt-1 text-sm text-neutral-600">Choose your house to continue, or use Admin login.</p>
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="text-sm font-semibold">Resident</div>
          <p className="mt-1 text-xs text-neutral-600">Pick your house, then your name.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {loadingHouses ? (
              <div className="col-span-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                Loading houses…
              </div>
            ) : null}
            {houses.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => void router.push({ pathname: `/house/${h.id}`, query: next ? { next } : {} })}
                className="rounded-xl bg-black px-4 py-3 text-left text-sm font-semibold text-white"
              >
                {h.name}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="text-sm font-semibold">Admin login</div>
          <p className="mt-1 text-xs text-neutral-600">For Admin and Getränkeminister accounts.</p>
          <form onSubmit={onAdminLogin} className="mt-3 space-y-3">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Login name</div>
              <input
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Password</div>
              <input
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>

            {adminError ? (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{adminError}</div>
            ) : null}

            <button
              type="submit"
              disabled={adminLoading || !loginName || !password}
              className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
            >
              {adminLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
