import Anthropic from "@anthropic-ai/sdk";
import { SERVICES, QUALIFIED, PRICING_DEFLECTION } from "./knowledge";
import type { Criteria, Fields, Turn, Usage, Verdict } from "./types";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const client = () => new Anthropic(); // reads ANTHROPIC_API_KEY

export const EMPTY_FIELDS: Fields = {
  name: null, callback_number: null, project_type: null, location: null, area_sqft: null,
  budget: null, timeline: null, ownership: null, referral: null, notes: null,
};
export const EMPTY_CRITERIA: Criteria = {
  real_project: "unclear", service_area: "unclear", timeline: "unclear", budget: "unclear", decision_maker: "unclear",
};

const SCHEMA = `Return ONLY a JSON object, no prose, no code fences:
{
  "reply": string,            // what you say next on the call (omit meaning if mode is analyse)
  "fields": { "name": string|null, "callback_number": string|null, "project_type": string|null, "location": string|null, "area_sqft": number|null, "budget": string|null, "timeline": string|null, "ownership": string|null, "referral": string|null, "notes": string|null },
  "criteria": { "real_project": "pass"|"fail"|"unclear", "service_area": "pass"|"fail"|"unclear", "timeline": "pass"|"fail"|"unclear", "budget": "pass"|"fail"|"unclear", "decision_maker": "pass"|"fail"|"unclear" },
  "evidence": { "real_project": string, "service_area": string, "timeline": string, "budget": string, "decision_maker": string },
  "intent": "new_enquiry"|"existing_client_issue"|"no_content",  // existing_client_issue = an existing client complaining/chasing about a running project; no_content = nothing usable
  "call_ended": boolean
}
Rules for fields: use null for anything the caller has not said. "budget" is only what the caller volunteered, verbatim. Never guess.
Rules for criteria (from the rubric): "real_project" is also "fail" when the project type is something the SERVICES document says the studio does not do (restaurants, hotels, retail, gyms, structural/architectural work, standalone furniture sourcing, standalone Vastu, advice-only). budget and decision_maker are "unclear" unless the caller gave a number that is clearly too low for the scope (fail) or clearly authorised/is the decider (pass). Budget NOT mentioned = "unclear" (treated as qualified later). Timeline: pass if execution is possible 8-10 weeks after consultation; fail only if the caller needs it in under ~6 weeks.`;

const VOICE_SYSTEM = `You are the phone enquiry agent for Aangan Studio, an interior design studio in Pune. You answer every call instantly, day or night.
You speak: short sentences, one question at a time, warm and plain. No lists, no markdown, no emojis.

GOALS
1. Get what the designer always has to ask (ask for the callback number early, once, and never ask for something already given): name, callback number, project type, location (area/locality), area in sq ft, budget (only if the caller volunteers it, never probe), timeline, ownership/site status (owner or tenant; ready or under construction).
2. Decide with the rubric whether this enquiry is worth a designer's time.
3. If qualified: before ending, always tell the caller by name that a designer from the team will call them back on the number they gave to confirm a free consultation (do not promise an exact time), then thank them. Never end a qualified call without saying this, and never say it (or set call_ended) until you actually have their callback number; if you do not have it yet, ask for it. If not: decline gracefully with the exact spirit of the rubric.

HARD RULES
- Never state, estimate or hint at any price, range, rate or per-sq-ft figure, even if pressed or asked for a ballpark. The only acceptable answer to a price question is: "${PRICING_DEFLECTION}" Asking for pricing does NOT disqualify the caller. After deflecting a price question, keep the call moving by asking the next missing detail, not by repeating the offer.
- Never promise anything the services document says the studio does not do (structural work, advice-only, standalone furniture, standalone Vastu, retail/hospitality, outside Pune/PCMC).
- Never invent facts about the studio. If unsure, say the designer will confirm.
- If the caller is outside the service area or only wants advice, say so honestly and kindly, and end the call.
- Unclear on real project / service area / timeline: ask ONE direct question. Unclear on budget or decision-maker: do not push.
- If the caller is an existing client complaining about a running project, apologise, take name and details, promise a senior callback, set intent "existing_client_issue" and end the call.
- When you have what you need (or the caller is clearly not a fit), close the call and set call_ended true.

=== SERVICES ===
${SERVICES}

=== RUBRIC (written by the founder) ===
${QUALIFIED}

${SCHEMA}`;

const ANALYSE_SYSTEM = `You are an analyst for Aangan Studio, an interior design studio in Pune. You are given a transcript of a past enquiry between the front desk and a caller. Extract the structured details the caller gave and judge each of the five rubric criteria strictly from what is said in the transcript. Do not assume facts that are not stated.

=== SERVICES ===
${SERVICES}

=== RUBRIC (written by the founder) ===
${QUALIFIED}

${SCHEMA}
For this task set "reply" to an empty string and "call_ended" to true.`;

interface Parsed {
  reply: string;
  fields: Fields;
  criteria: Criteria;
  evidence: Record<string, string>;
  call_ended: boolean;
  intent: "new_enquiry" | "existing_client_issue" | "no_content";
}

function parseJson(text: string): Parsed {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  const o = JSON.parse(text.slice(s, e + 1));
  return {
    reply: String(o.reply ?? ""),
    fields: { ...EMPTY_FIELDS, ...(o.fields ?? {}) },
    criteria: { ...EMPTY_CRITERIA, ...(o.criteria ?? {}) },
    evidence: o.evidence ?? {},
    call_ended: !!o.call_ended,
    intent: ["existing_client_issue", "no_content"].includes(o.intent) ? o.intent : "new_enquiry",
  };
}

/** Output guard: the agent must never say a price. Replace the whole reply if it tries. */
const PRICE_RE = /(₹|rs\.?|inr|rupees?)\s*\d|\d[\d,.]*\s*(lakh|lac|crore|k\b|per\s*sq|\/\s*sq)|per\s*sq\.?\s*(ft|foot|feet)/i;
export function guardPrice(reply: string): { reply: string; blocked: boolean } {
  return PRICE_RE.test(reply) ? { reply: PRICING_DEFLECTION, blocked: true } : { reply, blocked: false };
}

const useGemini = () => process.env.LLM_PROVIDER === "gemini" || (!process.env.ANTHROPIC_API_KEY && !!process.env.GEMINI_API_KEY);
export const PROVIDER = () => (useGemini() ? "gemini" : "anthropic");
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

async function callGemini(system: string, messages: Anthropic.MessageParam[]) {
  const key = process.env.GEMINI_API_KEY;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content) }] })),
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2000 },
  };
  for (let i = 0; i < 4; i++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key! }, body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 4000 * (i + 1))); continue; } // free-tier rate limit: back off
    if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j: any = await res.json();
    const text = (j.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
    const usage: Usage = { input_tokens: j.usageMetadata?.promptTokenCount ?? 0, output_tokens: j.usageMetadata?.candidatesTokenCount ?? 0 };
    return { parsed: parseJson(text), usage };
  }
  throw new Error("gemini: rate-limited, retry in a minute");
}

async function call(system: string, messages: Anthropic.MessageParam[]) {
  if (useGemini()) return callGemini(system, messages);
  const res = await client().messages.create({ model: MODEL, max_tokens: 1200, system, messages });
  const text = res.content.filter((b) => b.type === "text").map((b: any) => b.text).join("");
  const usage: Usage = { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens };
  return { parsed: parseJson(text), usage };
}

/** Rubric from qualified.md, applied deterministically to the model's per-criterion judgement. */
export function decide(c: Criteria, evidence: Record<string, string> = {}, opts: { intent?: Parsed["intent"]; strictUnclear?: boolean } = {}): Verdict {
  if (opts.intent === "existing_client_issue") {
    return { qualified: false, reason: "Existing client with a complaint about a running project — not a new lead; escalate to the studio head.", uncertainty: null };
  }
  if (opts.intent === "no_content") {
    return { qualified: false, reason: "No usable enquiry content (e.g. missed call / no details given).", uncertainty: null };
  }
  const names: Record<keyof Criteria, string> = {
    real_project: "not a real execution project", service_area: "outside Pune/PCMC", timeline: "timeline too short to execute",
    budget: "budget clearly too low for the scope", decision_maker: "caller is not the decision-maker",
  };
  const failed = (Object.keys(names) as (keyof Criteria)[]).filter((k) => c[k] === "fail");
  const unclearSoft = (["budget", "decision_maker"] as const).filter((k) => c[k] === "unclear");
  const unclearHard = (["real_project", "service_area", "timeline"] as const).filter((k) => c[k] === "unclear");
  if (failed.length) {
    return { qualified: false, reason: failed.map((k) => `${names[k]}${evidence[k] ? ` (${evidence[k]})` : ""}`).join("; "), uncertainty: null };
  }
  // Replay of a finished record: if we still cannot confirm two or more of the must-know criteria, there is nothing to forward.
  if (opts.strictUnclear && unclearHard.length >= 2) {
    return { qualified: false, reason: `Too little information to forward (unconfirmed: ${unclearHard.join(", ")}).`, uncertainty: null };
  }
  const unc: string[] = [];
  if (unclearSoft.includes("budget")) unc.push("budget not stated");
  if (unclearSoft.includes("decision_maker")) unc.push("decision-maker not confirmed");
  if (unclearHard.length) unc.push(`unconfirmed: ${unclearHard.join(", ")}`);
  return {
    qualified: true,
    reason: "Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented).",
    uncertainty: unc.length ? unc.join("; ") : null,
  };
}

const WORDS: Record<string, string> = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
const WORD_RE = /\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g;
/** Spoken text -> digits: "nine eight double two" -> "98822". Speech-to-text returns digits as words, digits, or a mix. */
const spokenDigits = (x: string) =>
  x.toLowerCase()
    .replace(/\b(double|triple)\s+(zero|oh|one|two|three|four|five|six|seven|eight|nine|\d)\b/g, (_m, k, w) => (WORDS[w] ?? w).repeat(k === "double" ? 2 : 3))
    .replace(WORD_RE, (w) => WORDS[w]);
const digits = (x: string) => spokenDigits(x).replace(/\D/g, "");

/**
 * The callback number is read from what the CALLER actually said, never from the model's output (the model once
 * invented one). Handles numbers split across several short utterances, which is how people read digits aloud.
 */
export function extractNumber(history: Turn[]): string | null {
  const pick = (d: string) => {
    if (d.length < 10) return null;
    const tail = d.slice(-10); // handles "+91 ..." and stray digits before the number
    return /^[6-9]/.test(tail) ? tail : (d.match(/[6-9]\d{9}/)?.[0] ?? null);
  };
  let buf = "";
  for (const t of history.filter((x) => x.role === "caller")) {
    const sp = spokenDigits(t.text);
    for (const run of sp.match(/(?:\d[\s\-.]*){10,}/g) ?? []) { const n = pick(run.replace(/\D/g, "")); if (n) return n; }
    const d = sp.replace(/\D/g, ""), nonSpace = sp.replace(/\s/g, "").length || 1;
    if (d.length >= 2 && d.length / nonSpace > 0.5) { buf += d; const n = pick(buf); if (n) return n; } else buf = "";
  }
  return null;
}
export const numberIsReal = (num: string | null, history: Turn[]) => !!num && extractNumber(history) === digits(num).slice(-10);
const ASK_NUMBER = "Before I let you go, what's the best number for a designer to call you back on?";

export async function agentTurn(history: Turn[]) {
  const messages: Anthropic.MessageParam[] = history.length
    ? history.map((t) => ({ role: t.role === "caller" ? "user" : "assistant", content: t.role === "caller" ? t.text : JSON.stringify({ reply: t.text }) }) as Anthropic.MessageParam)
    : [{ role: "user", content: "(The call has just connected. Greet the caller as Aangan Studio and ask how you can help.)" }];
  // The model replies as JSON; store only its spoken reply back into history on the client.
  const { parsed, usage } = await call(VOICE_SYSTEM, messages);
  const g = guardPrice(parsed.reply);
  let { fields, call_ended } = parsed;
  let reply = g.reply;
  fields = { ...fields, callback_number: extractNumber(history) }; // only a number the caller really said
  if (!fields.callback_number && call_ended && decide(parsed.criteria, parsed.evidence, { intent: parsed.intent }).qualified && parsed.intent === "new_enquiry") {
    // Ask for it, but never loop: after two asks the call is allowed to end and the handoff notes the missing number.
    const asked = history.filter((t) => t.role === "agent" && t.text.includes("best number for a designer")).length;
    if (asked < 2) { call_ended = false; reply = ASK_NUMBER; }
  }
  return { ...parsed, fields, call_ended, reply, price_guard_triggered: g.blocked, verdict: call_ended ? decide(parsed.criteria, parsed.evidence, { intent: parsed.intent }) : null, usage };
}

export async function analyseTranscript(transcriptText: string) {
  const { parsed, usage } = await call(ANALYSE_SYSTEM, [{ role: "user", content: transcriptText }]);
  return { ...parsed, verdict: decide(parsed.criteria, parsed.evidence, { intent: parsed.intent, strictUnclear: true }), usage };
}
