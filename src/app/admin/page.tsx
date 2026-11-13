import { Suspense } from "react";
import { Navbar } from "@/components/navigation/navbar";
import { AdminPanel } from "@/components/admin/admin-panel";
import { getAdminOverview } from "@/actions/admin";

export const instant = false;

async function AdminLoader() {
  const data = await getAdminOverview();
  return <AdminPanel data={data} />;
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16 md:pb-0">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <Suspense
          fallback={
            <div className="py-20 text-center text-muted font-mono text-sm animate-pulse">
              Carregando painel administrativo...
            </div>
          }
        >
          <AdminLoader />
        </Suspense>
      </main>
    </div>
  );
}
