import { agentTurn } from "./agent";
import { costInr } from "./cost";
import { sendHandoff } from "./handoff";
import { saveLive } from "./store";
import type { Criteria, EnquiryRecord, Fields, Turn, Usage, Verdict } from "./types";

/** Office hours per the case: front desk 10am–7pm IST. */
export function outsideHours(d: Date) {
  const ist = new Date(d.getTime() + 5.5 * 3600e3);
  const h = ist.getUTCHours();
  return h < 10 || h >= 19;
}

export interface TurnResult {
  reply: string;
  fields: Fields;
  criteria: Criteria;
  ended: boolean;
  verdict: Verdict | null;
  usage: Usage;
  latencyMs: number;
  priceGuardTriggered: boolean;
}

/** Channel-agnostic: every channel (sim, Vaani, later WhatsApp/web form) calls this with the running history. */
export async function processTurn(history: Turn[]): Promise<TurnResult> {
  const t0 = Date.now();
  const r = await agentTurn(history);
  return {
    reply: r.reply, fields: r.fields, criteria: r.criteria, ended: r.call_ended, verdict: r.verdict, usage: r.usage,
    latencyMs: Date.now() - t0, priceGuardTriggered: r.price_guard_triggered,
  };
}

export async function finalizeCall(args: {
  id: string; source: EnquiryRecord["source"]; turns: Turn[]; fields: Fields; criteria: Criteria; verdict: Verdict;
  usage: Usage; receivedAt: string; firstResponseMs: number; durationMin: number; callerIdNumber?: string;
}) {
  const received = new Date(args.receivedAt);
  const fields = { ...args.fields, callback_number: args.fields.callback_number ?? args.callerIdNumber ?? null };
  const cost = costInr(args.usage, args.durationMin, false) // LLM only; dashboard adds voice minutes at the assumed rate;
  const rec: EnquiryRecord = {
    id: args.id, source: args.source, receivedAt: args.receivedAt,
    respondedAt: new Date(received.getTime() + args.firstResponseMs).toISOString(),
    responseSeconds: Math.round(args.firstResponseMs / 100) / 10,
    outsideOfficeHours: outsideHours(received),
    fields, criteria: args.criteria, verdict: args.verdict, turns: args.turns, usage: args.usage,
    durationMin: args.durationMin, costInr: cost.totalInr,
    handoff: { sent: false, channel: null, at: null },
  };
  if (rec.verdict.qualified) rec.handoff = await sendHandoff(rec);
  await saveLive(rec);
  return rec;
}
