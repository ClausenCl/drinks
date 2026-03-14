import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { DrinkHistoryList, type DrinkHistoryItem } from "../components/DrinkHistoryList";
import { useMe } from "../components/useMe";

export default function HistoryPage() {
  const [items, setItems] = useState<DrinkHistoryItem[]>([]);
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "BEWOHNER") void router.replace(me.role === "ADMIN" ? "/admin" : "/manager");
  }, [loading, me, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/drinks/me");
      if (!res.ok) return;
      const data = (await res.json()) as DrinkHistoryItem[];
      if (!cancelled) setItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell title="History">
      <DrinkHistoryList items={items} />
    </AppShell>
  );
}
