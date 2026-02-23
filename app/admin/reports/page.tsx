import { RequireAuth } from "@/components/layout/require-auth";
import { ReportsView } from "@/components/admin/reports-view";

export default function ReportsPage() {
  return (
    <RequireAuth>
      <ReportsView />
    </RequireAuth>
  );
}
