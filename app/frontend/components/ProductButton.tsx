export function ProductButton(props: { name: string; price: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-left",
        "active:scale-[0.99] disabled:opacity-50",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-base font-semibold">{props.name}</div>
        <div className="text-base tabular-nums text-neutral-700">{props.price}</div>
      </div>
      <div className="mt-1 text-xs text-neutral-500">Tap to log</div>
    </button>
  );
}

