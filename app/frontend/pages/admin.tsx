import { AppShell } from "../components/AppShell";
import { AdminLogsTable } from "../components/AdminLogsTable";

export default function AdminPage() {
  return (
    <AppShell title="Admin">
      <AdminLogsTable />
    </AppShell>
  );
}

