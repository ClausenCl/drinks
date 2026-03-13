import { useRouter } from "next/router";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "LOGIN_FAILED");
        return;
      }
      await router.push("/menu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-neutral-900">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">Drinks</h1>
        <p className="mt-1 text-sm text-neutral-600">Login with your username and password.</p>

        <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Username</div>
            <input
              className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
            />
          </label>
          <label className="mt-3 block">
            <div className="mb-1 text-xs font-medium text-neutral-600">Password</div>
            <input
              className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <button
            type="submit"
            disabled={loading || !name || !password}
            className="mt-4 w-full rounded-xl bg-black px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

