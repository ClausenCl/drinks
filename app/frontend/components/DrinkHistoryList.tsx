export type DrinkHistoryItem = {
  id: string;
  createdAt: string;
  fridgeName: string;
  productName: string;
  quantity: number;
  priceAtTime: string;
  deleted: boolean;
  billed?: boolean;
};

export function DrinkHistoryList(props: { items: DrinkHistoryItem[] }) {
  if (props.items.length === 0) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm">No entries yet.</div>;
  }

  return (
    <ul className="space-y-2">
      {props.items.map((it) => (
        <li key={it.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {it.quantity}x {it.productName}
                {it.deleted ? " (deleted)" : ""}
              </div>
              <div className="truncate text-xs text-neutral-500">{it.fridgeName}</div>
            </div>
            <div className="shrink-0 text-xs tabular-nums text-neutral-700">{it.priceAtTime}</div>
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-neutral-500">{new Date(it.createdAt).toLocaleString()}</div>
        </li>
      ))}
    </ul>
  );
}
