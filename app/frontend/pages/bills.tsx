import { useEffect } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../components/AppShell";
import { BillCreator } from "../components/BillCreator";
import { useMe } from "../components/useMe";

export default function BillsPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !me) void router.replace("/");
    if (!loading && me && me.role !== "BEWOHNER") void router.replace(me.role === "ADMIN" ? "/admin" : "/manager");
  }, [loading, me, router]);

  return (
    <AppShell title="Bills">
      <BillCreator />
    </AppShell>
  );
}
