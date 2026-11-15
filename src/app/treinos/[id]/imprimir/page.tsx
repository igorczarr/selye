import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getRoutineForPrint } from "@/actions/routines";
import { PrintableRoutine } from "@/components/routines/printable-routine";

export const instant = false;

async function PrintLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRoutineForPrint(id);

  if (!data) {
    notFound();
  }

  return <PrintableRoutine data={data} />;
}

export default function ImprimirFichaPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen bg-background p-8 max-w-4xl mx-auto space-y-6"
          aria-busy="true"
        >
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-96 w-full" />
        </div>
      }
    >
      <PrintLoader params={props.params} />
    </Suspense>
  );
}
