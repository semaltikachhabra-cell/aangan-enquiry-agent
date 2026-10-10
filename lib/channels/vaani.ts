/**
 * Vaani adapter — built against the real docs (docs.vaanivoice.ai/guides/webhook-setup).
 *
 * Division of labour:
 *  - Vaani owns telephony, STT, TTS and the LIVE conversation (its own agent, configured with the prompt in
 *    docs/vaani-agent-prompt.md).
 *  - We own what happens AFTER the call: Vaani POSTs a `call_postprocessing` event with the transcript; we run the
 *    same rubric analyser used in the 40-transcript eval, store the record, and send the Telegram handoff.
 *
 * (Vaani also offers BYOL — a streaming WebSocket LLM. Vercel serverless can't host a WebSocket server, so we did
 * not use it; that would let *our* code speak live and enforce the price guard turn by turn.)
 */
import type { Turn } from "../types";

export interface VaaniPostProcessing {
  event: "call_postprocessing";
  call_id?: string;
  timestamp?: string;
  data: {
    room_name?: string;
    call_id?: string;
    call_duration?: number; // MILLISECONDS in this event
    end_reason?: string;
    summary?: string;
    entities?: Record<string, unknown>;
    dispositions?: Record<string, unknown>;
    recording_url?: string;
    transcript?: string; // "[13:33:14] AGENT: ...\n\n[13:33:19] USER: ..."
    phone_number?: string;
  };
}

/** "[hh:mm:ss] AGENT: text" lines -> Turn[] plus the clock time of the first agent line. */
export function parseVaaniTranscript(t: string): { turns: Turn[]; firstAgentAt: string | null } {
  const turns: Turn[] = [];
  let firstAgentAt: string | null = null;
  for (const block of t.split(/\n\s*\n/)) {
    const m = block.trim().match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(AGENT|USER):\s*([\s\S]*)$/i);
    if (!m) continue;
    const role = m[2].toUpperCase() === "AGENT" ? "agent" : "caller";
    if (role === "agent" && !firstAgentAt) firstAgentAt = m[1];
    turns.push({ role, text: m[3].trim() });
  }
  return { turns, firstAgentAt };
}

/** Plain-text transcript in the same shape the analyser was evaluated on. */
export const toTranscriptText = (turns: Turn[]) =>
  turns.map((t) => `${t.role === "agent" ? "Front Desk" : "Caller"}: ${t.text}`).join("\n");

/** Seconds from "call connected" to the agent's first line, if the timestamps make that checkable. */
export function responseSecondsFrom(eventTimestamp: string | undefined, durationMs: number | undefined, firstAgentAt: string | null) {
  if (!eventTimestamp || !durationMs || !firstAgentAt) return null;
  const end = new Date(eventTimestamp);
  const [h, m, s] = firstAgentAt.split(":").map(Number);
  const first = new Date(end);
  first.setUTCHours(h, m, s, 0);
  let sec = (first.getTime() - (end.getTime() - durationMs)) / 1000;
  if (sec < -3600) sec += 86400;
  return sec >= 0 && sec <= 120 ? Math.round(sec * 10) / 10 : null;
}
