import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { DrinkHistoryList, type DrinkHistoryItem } from "../components/DrinkHistoryList";
import { useMe } from "../components/useMe";

type BillShare = { id: string; title: string; createdAt: string; shareAmount: string; billed: boolean };
type ManualCharge = { id: string; title: string; createdAt: string; amount: string; billed: boolean };
type InvoiceSummary = { id: string; title: string; createdAt: string; total: string };
type InvoiceDetail = {
  id: string;
  title: string;
  createdAt: string;
  total: string;
  drinks: { id: string; createdAt: string; fridgeName: string; itemName: string; quantity: number; unitPrice: string; total: string }[];
  eventBills: { id: string; billId: string; title: string; createdAt: string; total: string }[];
  manualCharges: { id: string; title: string; createdAt: string; total: string }[];
};

export default function HistoryPage() {
  const [items, setItems] = useState<DrinkHistoryItem[]>([]);
  const [billShares, setBillShares] = useState<BillShare[]>([]);
  const [charges, setCharges] = useState<ManualCharge[]>([]);
  const [tab, setTab] = useState<"unbilled" | "billed">("unbilled");
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [unbilledTotal, setUnbilledTotal] = useState("0.00");
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const { me, loading } = useMe();
  const router = useRouter();
  const canLoadProtectedData = me?.role === "BEWOHNER" && me.pinVerified !== false;

  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "BEWOHNER") void router.replace(me.role === "ADMIN" ? "/admin" : "/manager");
  }, [loading, me, router]);

  useEffect(() => {
    if (!canLoadProtectedData) return;
    let cancelled = false;
    (async () => {
      setOverviewLoading(true);
      try {
        const res = await fetch("/api/history/overview");
        if (!res.ok) return;
        const data = (await res.json()) as { unbilledTotal: string; invoices: InvoiceSummary[] };
        if (cancelled) return;
        setUnbilledTotal(data.unbilledTotal);
        setInvoices(data.invoices);
        setSelectedInvoiceId((prev) => prev || data.invoices[0]?.id || "");
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoadProtectedData]);

  useEffect(() => {
    if (!canLoadProtectedData) return;
    if (tab !== "unbilled") return;
    let cancelled = false;
    (async () => {
      const [dRes, bRes, cRes] = await Promise.all([
        fetch("/api/drinks/me?billed=unbilled"),
        fetch("/api/bills/me?billed=unbilled"),
        fetch("/api/manual-charges/me?billed=unbilled"),
      ]);
      if (dRes.ok) {
        const data = (await dRes.json()) as DrinkHistoryItem[];
        if (!cancelled) setItems(data);
      }
      if (bRes.ok) {
        const data = (await bRes.json()) as BillShare[];
        if (!cancelled) setBillShares(data);
      }
      if (cRes.ok) {
        const data = (await cRes.json()) as ManualCharge[];
        if (!cancelled) setCharges(data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoadProtectedData, tab]);

  useEffect(() => {
    if (!canLoadProtectedData) return;
    if (tab !== "billed" || !selectedInvoiceId) {
      setInvoiceDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setInvoiceLoading(true);
      try {
        const res = await fetch(`/api/history/invoices/${selectedInvoiceId}`);
        if (!res.ok) {
          if (!cancelled) setInvoiceDetail(null);
          return;
        }
        const data = (await res.json()) as InvoiceDetail;
        if (!cancelled) setInvoiceDetail(data);
      } finally {
        if (!cancelled) setInvoiceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoadProtectedData, selectedInvoiceId, tab]);

  const selectedInvoiceTitle = useMemo(() => invoices.find((i) => i.id === selectedInvoiceId)?.title ?? "", [invoices, selectedInvoiceId]);

  return (
    <AppShell title="History">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            className={["flex-1 rounded-xl px-4 py-3 text-sm font-semibold", tab === "unbilled" ? "bg-black text-white" : "bg-neutral-100"].join(" ")}
            onClick={() => setTab("unbilled")}
          >
            Not invoiced
          </button>
          <button
            type="button"
            className={["flex-1 rounded-xl px-4 py-3 text-sm font-semibold", tab === "billed" ? "bg-black text-white" : "bg-neutral-100"].join(" ")}
            onClick={() => setTab("billed")}
          >
            Invoiced
          </button>
        </div>

        {tab === "unbilled" ? (
          <>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-xs text-neutral-600">If invoiced now</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{unbilledTotal} EUR</div>
            </div>

            <section className="space-y-2">
              <div className="text-sm font-semibold">Drinks</div>
              <DrinkHistoryList items={items} />
            </section>

            <section className="space-y-2">
              <div className="text-sm font-semibold">Event bills</div>
              {billShares.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">No entries.</div>
              ) : (
                <ul className="space-y-2">
                  {billShares.map((b) => (
                    <li key={b.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0 truncate text-sm font-semibold">{b.title}</div>
                        <div className="shrink-0 tabular-nums text-sm text-neutral-700">{b.shareAmount}</div>
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{new Date(b.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <div className="text-sm font-semibold">Manual charges</div>
              {charges.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">No entries.</div>
              ) : (
                <ul className="space-y-2">
                  {charges.map((c) => (
                    <li key={c.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0 truncate text-sm font-semibold">{c.title}</div>
                        <div className="shrink-0 tabular-nums text-sm text-neutral-700">{c.amount}</div>
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{new Date(c.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <div className="text-sm font-semibold">Invoices</div>
              {overviewLoading ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">Loading invoices…</div>
              ) : invoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">No invoices yet.</div>
              ) : (
                <ul className="space-y-2">
                  {invoices.map((invoice) => (
                    <li key={invoice.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                        className={[
                          "w-full rounded-2xl border px-3 py-3 text-left",
                          selectedInvoiceId === invoice.id ? "border-black bg-neutral-100" : "border-neutral-200 bg-white",
                        ].join(" ")}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="min-w-0 truncate text-sm font-semibold">{invoice.title}</div>
                          <div className="shrink-0 tabular-nums text-sm text-neutral-700">{invoice.total}</div>
                        </div>
                        <div className="mt-1 text-xs text-neutral-500">{new Date(invoice.createdAt).toLocaleString()}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <div className="text-sm font-semibold">Invoice details {selectedInvoiceTitle ? `· ${selectedInvoiceTitle}` : ""}</div>
              {invoiceLoading ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">Loading details…</div>
              ) : !invoiceDetail ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">Select an invoice.</div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="text-xs text-neutral-600">Invoice total</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">{invoiceDetail.total} EUR</div>
                    <div className="mt-1 text-xs text-neutral-500">{new Date(invoiceDetail.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                    <div className="text-sm font-semibold">Drinks</div>
                    {invoiceDetail.drinks.length === 0 ? (
                      <div className="mt-2 text-sm text-neutral-600">No drinks.</div>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {invoiceDetail.drinks.map((drink) => (
                          <li key={drink.id} className="flex items-baseline justify-between gap-3 text-sm">
                            <div className="min-w-0 truncate">
                              {drink.quantity}× {drink.itemName} · {drink.fridgeName}
                            </div>
                            <div className="shrink-0 tabular-nums">{drink.total}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                    <div className="text-sm font-semibold">Event bills</div>
                    {invoiceDetail.eventBills.length === 0 ? (
                      <div className="mt-2 text-sm text-neutral-600">No event bills.</div>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {invoiceDetail.eventBills.map((bill) => (
                          <li key={bill.id} className="flex items-baseline justify-between gap-3 text-sm">
                            <div className="min-w-0 truncate">{bill.title}</div>
                            <div className="shrink-0 tabular-nums">{bill.total}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-white p-3">
                    <div className="text-sm font-semibold">Manual charges</div>
                    {invoiceDetail.manualCharges.length === 0 ? (
                      <div className="mt-2 text-sm text-neutral-600">No manual charges.</div>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {invoiceDetail.manualCharges.map((charge) => (
                          <li key={charge.id} className="flex items-baseline justify-between gap-3 text-sm">
                            <div className="min-w-0 truncate">{charge.title}</div>
                            <div className="shrink-0 tabular-nums">{charge.total}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
