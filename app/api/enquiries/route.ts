import { NextResponse } from "next/server";
import { all } from "@/lib/store";
import { RATES } from "@/lib/cost";

export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ records: await all(), rates: RATES });
}
