import Link from "next/link";
import { useEffect, useState } from "react";

type ResidentRow = { id: string };
type FridgeRow = { id: string };

export function OpsQuickActions(props: { basePath: "/admin" | "/manager" }) {
  const [firstResidentId, setFirstResidentId] = useState("");
  const [firstFridgeId, setFirstFridgeId] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [residentsRes, fridgesRes] = await Promise.all([
        fetch("/api/manage/users?take=1"),
        fetch("/api/manage/fridges"),
      ]);

      if (residentsRes.ok) {
        const residents = (await residentsRes.json()) as ResidentRow[];
        if (!cancelled) setFirstResidentId(residents[0]?.id ?? "");
      }
      if (fridgesRes.ok) {
        const fridges = (await fridgesRes.json()) as FridgeRow[];
        if (!cancelled) setFirstFridgeId(fridges[0]?.id ?? "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">Quick actions</div>
      <div className="mt-3 grid grid-cols-1 gap-2">
        <Link
          href={firstResidentId ? `${props.basePath}/residents/${firstResidentId}` : `${props.basePath}/residents`}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          Edit resident profile
        </Link>
        <Link
          href={firstFridgeId ? `${props.basePath}/fridges?focus=${firstFridgeId}` : `${props.basePath}/fridges`}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          Update fridge items
        </Link>
        <Link
          href={`${props.basePath}/finance#billing-create`}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          Start billing run
        </Link>
      </div>
    </div>
  );
}
