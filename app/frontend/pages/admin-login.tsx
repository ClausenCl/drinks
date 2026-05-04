import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useMe } from "../components/useMe";

export default function AdminLoginPage() {
  const router = useRouter();
  const next = useMemo(() => (typeof router.query.next === "string" ? router.query.next : ""), [router.query.next]);
  const { me, loading: loadingMe } = useMe();

  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loadingMe || !me) return;
    if (me.role === "BEWOHNER") {
      void router.replace(next || "/buy");
      return;
    }
    void router.replace(me.role === "ADMIN" ? "/admin" : "/manager");
  }, [loadingMe, me, next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ loginName, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "LOGIN_FAILED");
        return;
      }
      const me = (await res.json()) as { role: "ADMIN" | "GETRAENKEMINISTER" | "BEWOHNER" };
      const target = me.role === "ADMIN" ? "/admin" : "/manager";
      await router.push(next ? { pathname: target, query: { next } } : target);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <Link href="/" className="text-sm underline">
            ← Back
          </Link>
          <h1 className="mt-3 text-2xl font-bold">Admin login</h1>
          <p className="mt-1 text-sm text-neutral-600">For Admin and Getränkeminister accounts.</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="space-y-3">
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

            {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <button
              type="submit"
              disabled={loading || !loginName || !password}
              className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
