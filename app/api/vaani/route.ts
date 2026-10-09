import { NextResponse } from "next/server";
import { historyFromVaani, parseVaani, toVaani } from "@/lib/channels/vaani";
import { finalizeCall, processTurn } from "@/lib/session";

export const maxDuration = 60;

// Vaani webhook adapter (stub — see lib/channels/vaani.ts). Stateless: Vaani sends history each turn.
export async function POST(req: Request) {
  const secret = process.env.VAANI_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-vaani-secret") !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const e = parseVaani(await req.json());
  const history = historyFromVaani(e);
  const r = await processTurn(history);
  if (r.ended && r.verdict) {
    await finalizeCall({
      id: e.call_id, source: "vaani", turns: [...history, { role: "agent", text: r.reply }], fields: r.fields,
      criteria: r.criteria, verdict: r.verdict, usage: r.usage, receivedAt: e.started_at ?? new Date().toISOString(),
      firstResponseMs: r.latencyMs, durationMin: Math.max(0.5, history.length * 0.25), callerIdNumber: e.from_number,
    });
  }
  return NextResponse.json(toVaani(r.reply, r.ended));
}
