export type FridgeOption = { id: string; name: string };

export function FridgeSelector(props: {
  fridges: FridgeOption[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium">Fridge</div>
      <select
        className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base"
        value={props.value ?? ""}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="" disabled>
          Select a fridge
        </option>
        {props.fridges.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </label>
  );
}

