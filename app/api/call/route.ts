import { NextResponse } from "next/server";
import { finalizeCall, processTurn } from "@/lib/session";
import type { Turn } from "@/lib/types";

export const maxDuration = 60;

// Text-simulated call turn. The browser plays the caller; Vaani will hit /api/vaani with the same core.
export async function POST(req: Request) {
  const { callId, history, receivedAt, firstResponseMs, usageSoFar, startedMs } = (await req.json()) as {
    callId: string; history: Turn[]; receivedAt: string; firstResponseMs?: number; usageSoFar?: { input_tokens: number; output_tokens: number }; startedMs: number;
  };
  try {
    const r = await processTurn(history);
    const usage = {
      input_tokens: (usageSoFar?.input_tokens ?? 0) + r.usage.input_tokens,
      output_tokens: (usageSoFar?.output_tokens ?? 0) + r.usage.output_tokens,
    };
    const first = firstResponseMs ?? r.latencyMs;
    let record = null;
    if (r.ended && r.verdict) {
      const turns: Turn[] = [...history, { role: "agent", text: r.reply }];
      record = await finalizeCall({
        id: callId, source: "live-sim", turns, fields: r.fields, criteria: r.criteria, verdict: r.verdict, usage,
        receivedAt, firstResponseMs: first, durationMin: Math.max(0.5, (Date.now() - startedMs) / 60000),
      });
    }
    return NextResponse.json({ ...r, usage, firstResponseMs: first, record });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
