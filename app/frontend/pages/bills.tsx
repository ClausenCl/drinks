import { AppShell } from "../components/AppShell";
import { BillCreator } from "../components/BillCreator";

export default function BillsPage() {
  return (
    <AppShell title="Bills">
      <BillCreator />
    </AppShell>
  );
}

