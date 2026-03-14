import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useMe } from "./useMe";

export function AppShell(props: { title: string; children: ReactNode }) {
  const router = useRouter();
  const current = router.pathname;
  const { me } = useMe();

  const NavLink = (p: { href: string; label: string }) => (
    <Link
      href={p.href}
      className={[
        "rounded-full px-3 py-2 text-sm font-medium",
        current === p.href ? "bg-black text-white" : "bg-neutral-100 text-neutral-900",
      ].join(" ")}
    >
      {p.label}
    </Link>
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    await router.push("/");
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{props.title}</div>
          </div>
          <nav className="flex shrink-0 items-center gap-2">
            {me?.role === "ADMIN" ? <NavLink href="/admin" label="Admin" /> : null}
            {me?.role === "GETRAENKEMINISTER" ? <NavLink href="/manager" label="Manager" /> : null}
            {me?.role === "BEWOHNER" ? (
              <>
                <NavLink href="/menu" label="Menu" />
                <NavLink href="/history" label="History" />
                <NavLink href="/bills" label="Bills" />
                <NavLink href="/settings" label="Settings" />
              </>
            ) : null}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900"
              title="Log out"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4">{props.children}</main>
    </div>
  );
}
