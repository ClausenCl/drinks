import Link from "next/link";

type Domain = {
  key: "residents" | "fridges" | "finance" | "system";
  title: string;
  subtitle: string;
};

const domains: Domain[] = [
  { key: "residents", title: "Residents", subtitle: "People, profiles and resident ledgers" },
  { key: "fridges", title: "Fridges", subtitle: "Fridge setup, items, prices and QR codes" },
  { key: "finance", title: "Finance", subtitle: "Unbilled totals, bills, charges and billing runs" },
  { key: "system", title: "System", subtitle: "Houses, ministers and audit/system settings" },
];

export function OpsDomainCards(props: { basePath: "/admin" | "/manager" }) {
  const isAdmin = props.basePath === "/admin";
  return (
    <div className="grid grid-cols-1 gap-3">
      {domains.map((domain) => (
        <Link
          key={domain.key}
          href={`${props.basePath}/${domain.key}`}
          className={[
            "rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]",
            isAdmin ? "border-slate-200 bg-slate-50/70" : "border-emerald-200 bg-emerald-50/70",
          ].join(" ")}
        >
          <div className="text-base font-semibold text-neutral-900">{domain.title}</div>
          <div className="mt-1 text-xs text-neutral-700">{domain.subtitle}</div>
        </Link>
      ))}
    </div>
  );
}

export function OpsDomainTabs(props: { basePath: "/admin" | "/manager"; active: Domain["key"] }) {
  const isAdmin = props.basePath === "/admin";
  return (
    <div className={["rounded-2xl border p-3 shadow-sm", isAdmin ? "border-slate-200 bg-slate-50/80" : "border-emerald-200 bg-emerald-50/80"].join(" ")}>
      <div className="mb-2 text-xs font-medium text-neutral-700">Operations</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {domains.map((domain) => {
          const active = props.active === domain.key;
          return (
            <Link
              key={domain.key}
              href={`${props.basePath}/${domain.key}`}
              className={[
                "shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition active:scale-[0.98]",
                active
                  ? isAdmin
                    ? "border-slate-900 bg-slate-900 text-white shadow-md"
                    : "border-emerald-700 bg-emerald-700 text-white shadow-md"
                  : "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-100",
              ].join(" ")}
            >
              {domain.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
