import { AppShell } from "../components/AppShell";
import { ResidentConsumptionTable } from "../components/ResidentConsumptionTable";

export default function ManagerPage() {
  return (
    <AppShell title="Manager">
      <ResidentConsumptionTable />
    </AppShell>
  );
}

