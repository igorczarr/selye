import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { AdminPanel } from "@/components/admin/admin-panel";
import { getAdminOverview } from "@/actions/admin";
import { requireRole } from "@/lib/auth-role";

export const instant = false;

async function AdminLoader() {
  await requireRole("admin");
  const data = await getAdminOverview();
  return <AdminPanel data={data} />;
}

function AdminSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Carregando painel administrativo"
    >
      <div className="space-y-2">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-64 w-full" />
      <div className="skeleton h-40 w-full" />
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Navbar />
      <main className="selye-container py-6 flex-1">
        <Suspense fallback={<AdminSkeleton />}>
          <AdminLoader />
        </Suspense>
      </main>
    </div>
  );
}
