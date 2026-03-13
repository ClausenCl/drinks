import { useState } from "react";

export function BillCreator() {
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-sm font-semibold">Create shared bill</div>
      <div className="mt-3 space-y-3">
        <label className="block">
          <div className="mb-1 text-xs font-medium text-neutral-600">Title</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Party snacks"
          />
        </label>
        <label className="block">
          <div className="mb-1 text-xs font-medium text-neutral-600">Total amount</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-base tabular-nums"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="e.g. 23.50"
            inputMode="decimal"
          />
        </label>
        <button
          type="button"
          disabled
          className="w-full rounded-xl bg-neutral-200 px-4 py-3 text-base font-semibold text-neutral-600"
          title="Participants selection is implemented in Phase 7"
        >
          Create bill (coming soon)
        </button>
      </div>
    </div>
  );
}

