/**
 * Vaani adapter (STUB — Vaani credentials/payload schema were not available when this was built).
 *
 * Vaani owns telephony + STT + TTS. We only own the middle: text in -> text out.
 * To wire it up: in the Vaani agent config, point its custom-LLM / webhook URL at POST /api/vaani and set the
 * shared secret in VAANI_WEBHOOK_SECRET. Adjust `parseVaani` / `toVaani` to the real payload shape below —
 * nothing else in the codebase needs to change, because lib/session.ts is channel-agnostic.
 */
import type { Turn } from "../types";

export interface VaaniEvent {
  call_id: string;
  event: "utterance" | "call_ended";
  from_number?: string;
  started_at?: string;
  utterance?: string; // latest caller speech, already transcribed by Vaani STT
  history?: { role: "user" | "assistant"; text: string }[];
}

export function parseVaani(body: any): VaaniEvent {
  // ASSUMED shape. Replace once the real Vaani schema is known.
  return body as VaaniEvent;
}

export function historyFromVaani(e: VaaniEvent): Turn[] {
  const h: Turn[] = (e.history ?? []).map((m) => ({ role: m.role === "user" ? "caller" : "agent", text: m.text }));
  if (e.utterance) h.push({ role: "caller", text: e.utterance });
  return h;
}

export function toVaani(reply: string, ended: boolean) {
  // ASSUMED response shape: text for Vaani TTS to speak, and a hangup flag.
  return { text: reply, end_call: ended };
}
