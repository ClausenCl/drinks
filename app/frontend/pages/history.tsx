import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { DrinkHistoryList, type DrinkHistoryItem } from "../components/DrinkHistoryList";

export default function HistoryPage() {
  const [items, setItems] = useState<DrinkHistoryItem[]>([]);

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

