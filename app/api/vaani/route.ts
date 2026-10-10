import { NextResponse } from "next/server";
import { analyseTranscript, extractNumber, guardPrice } from "@/lib/agent";
import { parseVaaniTranscript, responseSecondsFrom, toTranscriptText, type VaaniPostProcessing } from "@/lib/channels/vaani";
import { finalizeCall } from "@/lib/session";
import { live } from "@/lib/store";

export const maxDuration = 60;

/**
 * Vaani webhook. Register in Vaani: Settings → Webhooks →  https://<site>/api/vaani?key=<VAANI_WEBHOOK_SECRET>
 * (Vaani documents no signature header, so the secret rides in the URL.)
 * Only `call_postprocessing` carries the transcript; every other lifecycle event is acknowledged and ignored.
 */
export async function POST(req: Request) {
  const secret = process.env.VAANI_WEBHOOK_SECRET;
  if (secret && new URL(req.url).searchParams.get("key") !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as VaaniPostProcessing | null;
  if (!body || body.event !== "call_postprocessing" || !body.data?.transcript) return NextResponse.json({ status: "ignored" });

  const d = body.data;
  const id = d.call_id ?? d.room_name ?? body.call_id ?? `vaani-${Date.now()}`;
  if ((await live()).some((r) => r.id === id)) return NextResponse.json({ status: "duplicate" }); // Vaani may retry; never double-notify a designer

  const { turns, firstAgentAt } = parseVaaniTranscript(d.transcript!);
  if (!turns.some((t) => t.role === "caller")) return NextResponse.json({ status: "no caller speech" });

  const a = await analyseTranscript(toTranscriptText(turns));
  const fields = { ...a.fields };
  fields.callback_number = extractNumber(turns); // only a number the caller really said
  const durationMin = Math.max(0.1, (d.call_duration ?? 60000) / 60000);

  // Audit the live agent's own words: it must never have said a price.
  const leaked = turns.filter((t) => t.role === "agent" && guardPrice(t.text).blocked);
  const verdict = leaked.length
    ? { ...a.verdict, uncertainty: [a.verdict.uncertainty, "⚠ voice agent may have stated a price — review the transcript"].filter(Boolean).join("; ") }
    : a.verdict;

  const rec = await finalizeCall({
    id, source: "vaani", turns, fields, criteria: a.criteria, verdict, usage: a.usage,
    receivedAt: body.timestamp ? new Date(new Date(body.timestamp).getTime() - durationMin * 60000).toISOString() : new Date().toISOString(),
    firstResponseMs: (responseSecondsFrom(body.timestamp, d.call_duration, firstAgentAt) ?? NaN) * 1000,
    durationMin, callerIdNumber: d.phone_number,
  });
  return NextResponse.json({ status: "ok", qualified: rec.verdict.qualified, handoff: rec.handoff });
}
