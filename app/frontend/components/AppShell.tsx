import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent, type ReactNode } from "react";
import { useMe } from "./useMe";

export function AppShell(props: { title: string; children: ReactNode }) {
  const router = useRouter();
  const current = router.pathname;
  const { me } = useMe();
  const protectedResidentRoutes = new Set(["/history", "/bills", "/settings"]);
  const accent = me?.houseColor && /^#[0-9a-fA-F]{6}$/.test(me.houseColor) ? me.houseColor : "#111827";
  const [menuOpen, setMenuOpen] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [residentUnlockedLocally, setResidentUnlockedLocally] = useState(false);

  const needsResidentUnlock =
    me?.role === "BEWOHNER" &&
    me.pinVerified === false &&
    protectedResidentRoutes.has(current) &&
    !residentUnlockedLocally;

  const NavLink = (p: { href: string; label: string }) => (
    <Link
      href={p.href}
      className={[
        "rounded-full px-3 py-2 text-sm font-medium",
        current === p.href ? "text-white" : "bg-neutral-100 text-neutral-900",
      ].join(" ")}
      style={current === p.href ? { backgroundColor: accent } : undefined}
    >
      {p.label}
    </Link>
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    await router.push("/");
  }

  async function unlockResidentArea(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(unlockPin)) {
      setUnlockError("PIN must be 4 digits.");
      return;
    }
    setUnlockError(null);
    setUnlocking(true);
    try {
      const res = await fetch("/api/auth/resident-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: unlockPin }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        if (body?.error === "PIN_REQUIRED_SETUP") {
          setUnlockError("PIN is not set yet. Ask admin/minister.");
          return;
        }
        setUnlockError("Wrong PIN.");
        return;
      }
      setUnlockPin("");
      setMenuOpen(false);
      setResidentUnlockedLocally(true);
      window.dispatchEvent(new Event("drinks:session-changed"));
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-100 text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate text-base font-semibold">
              {me?.houseColor ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} /> : null}
              <span className="truncate">{props.title}</span>
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-2">
            {me?.role === "ADMIN" ? <NavLink href="/admin" label="Admin" /> : null}
            {me?.role === "GETRAENKEMINISTER" ? <NavLink href="/manager" label="Manager" /> : null}
            {me?.role === "BEWOHNER" ? (
              <div className="relative">
                <button
                  type="button"
                  className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 shadow-sm"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  Menu
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-11 z-30 min-w-40 space-y-1 rounded-xl border border-neutral-200 bg-white p-2 shadow-md">
                    <Link href="/menu" className="block rounded-lg px-3 py-2 text-sm hover:bg-neutral-100">
                      Menu
                    </Link>
                    <Link href="/history" className="block rounded-lg px-3 py-2 text-sm hover:bg-neutral-100">
                      History
                    </Link>
                    <Link href="/bills" className="block rounded-lg px-3 py-2 text-sm hover:bg-neutral-100">
                      Bills
                    </Link>
                    <Link href="/settings" className="block rounded-lg px-3 py-2 text-sm hover:bg-neutral-100">
                      Settings
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 shadow-sm"
              title="Log out"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-5">
        {needsResidentUnlock ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="text-sm font-semibold">PIN required</div>
            <p className="mt-1 text-xs text-neutral-600">Enter your PIN once to access History, Bills and Settings.</p>
            <form onSubmit={unlockResidentArea} className="mt-3 space-y-2">
              <input
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tabular-nums tracking-widest"
                value={unlockPin}
                onChange={(e) => setUnlockPin(e.target.value)}
                placeholder="1234"
                inputMode="numeric"
                autoFocus
              />
              {unlockError ? <div className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{unlockError}</div> : null}
              <button type="submit" disabled={unlocking} className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {unlocking ? "Checking…" : "Continue"}
              </button>
            </form>
          </div>
        ) : (
          props.children
        )}
      </main>
    </div>
  );
}
