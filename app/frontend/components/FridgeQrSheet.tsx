import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Fridge = { id: string; name: string };

export function FridgeQrSheet(props: { basePath: "/admin" | "/manager" }) {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/manage/fridges");
        if (!res.ok) return;
        const data = (await res.json()) as Fridge[];
        if (!cancelled) setFridges(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm print:hidden">
        <div className="text-sm font-semibold">Print-ready QR sheet</div>
        <p className="mt-1 text-xs text-neutral-600">Use print to create a paper sheet with all available fridges.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white" onClick={() => window.print()}>
            Print
          </button>
          <Link href={`${props.basePath}/fridges`} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold">
            Back to fridges
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">Loading fridges…</div>
      ) : fridges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">No fridges available.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 print:grid-cols-3">
          {fridges.map((fridge) => (
            <div key={fridge.id} className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
              <div className="truncate text-xs font-semibold">{fridge.name}</div>
              <div className="mt-2 flex justify-center">
                <Image
                  src={`/api/manage/fridges/${fridge.id}/qr`}
                  alt={`QR for ${fridge.name}`}
                  width={128}
                  height={128}
                  unoptimized
                  className="h-32 w-32 rounded-lg border border-neutral-200 bg-white p-1"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
