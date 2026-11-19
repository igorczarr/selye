import { NextResponse } from "next/server";
import { sendDailyPlanEmailReminder } from "@/actions/planning";

export async function GET() {
  try {
    const result = await sendDailyPlanEmailReminder();
    return NextResponse.json(
      {
        status: result.ok ? "sent" : "failed",
        ...result,
      },
      { status: result.ok ? 200 : 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: err?.message || "Erro ao disparar resumo diário.",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
