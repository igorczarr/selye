import { notFound } from "next/navigation";
import { getRoutineForPrint } from "@/actions/routines";
import { PrintableRoutine } from "@/components/routines/printable-routine";

export const instant = false;

export default async function ImprimirFichaPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const data = await getRoutineForPrint(params.id);

  if (!data) {
    notFound();
  }

  return <PrintableRoutine data={data} />;
}