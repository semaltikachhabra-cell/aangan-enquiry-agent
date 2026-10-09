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
  "call_ended": boolean
}
Rules for fields: use null for anything the caller has not said. "budget" is only what the caller volunteered, verbatim. Never guess.
Rules for criteria (from the rubric): budget and decision_maker are "unclear" unless the caller gave a number that is clearly too low for the scope (fail) or clearly authorised/is the decider (pass). Budget NOT mentioned = "unclear" (treated as qualified later). Timeline: pass if execution is possible 8-10 weeks after consultation; fail only if the caller needs it in under ~6 weeks.`;

const VOICE_SYSTEM = `You are the phone enquiry agent for Aangan Studio, an interior design studio in Pune. You answer every call instantly, day or night.
You speak: short sentences, one question at a time, warm and plain. No lists, no markdown, no emojis.

GOALS
1. Get what the designer always has to ask: name, callback number, project type, location (area/locality), area in sq ft, budget (only if the caller volunteers it, never probe), timeline, ownership/site status (owner or tenant; ready or under construction).
2. Decide with the rubric whether this enquiry is worth a designer's time.
3. If qualified: tell the caller a designer will call back and offer to book a consultation. If not: decline gracefully with the exact spirit of the rubric.

HARD RULES
- Never state, estimate or hint at any price, range, rate or per-sq-ft figure, even if pressed or asked for a ballpark. The only acceptable answer to a price question is: "${PRICING_DEFLECTION}" Asking for pricing does NOT disqualify the caller.
- Never promise anything the services document says the studio does not do (structural work, advice-only, standalone furniture, standalone Vastu, retail/hospitality, outside Pune/PCMC).
- Never invent facts about the studio. If unsure, say the designer will confirm.
- If the caller is outside the service area or only wants advice, say so honestly and kindly, and end the call.
- Unclear on real project / service area / timeline: ask ONE direct question. Unclear on budget or decision-maker: do not push.
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
  };
}

/** Output guard: the agent must never say a price. Replace the whole reply if it tries. */
const PRICE_RE = /(₹|rs\.?|inr|rupees?)\s*\d|\d[\d,.]*\s*(lakh|lac|crore|k\b|per\s*sq|\/\s*sq)|per\s*sq\.?\s*(ft|foot|feet)/i;
export function guardPrice(reply: string): { reply: string; blocked: boolean } {
  return PRICE_RE.test(reply) ? { reply: PRICING_DEFLECTION, blocked: true } : { reply, blocked: false };
}

async function call(system: string, messages: Anthropic.MessageParam[]) {
  const res = await client().messages.create({ model: MODEL, max_tokens: 1200, system, messages });
  const text = res.content.filter((b) => b.type === "text").map((b: any) => b.text).join("");
  const usage: Usage = { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens };
  return { parsed: parseJson(text), usage };
}

/** Rubric from qualified.md, applied deterministically to the model's per-criterion judgement. */
export function decide(c: Criteria, evidence: Record<string, string> = {}): Verdict {
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

export async function agentTurn(history: Turn[]) {
  const messages: Anthropic.MessageParam[] = history.length
    ? history.map((t) => ({ role: t.role === "caller" ? "user" : "assistant", content: t.role === "caller" ? t.text : JSON.stringify({ reply: t.text }) }) as Anthropic.MessageParam)
    : [{ role: "user", content: "(The call has just connected. Greet the caller as Aangan Studio and ask how you can help.)" }];
  // The model replies as JSON; store only its spoken reply back into history on the client.
  const { parsed, usage } = await call(VOICE_SYSTEM, messages);
  const g = guardPrice(parsed.reply);
  return { ...parsed, reply: g.reply, price_guard_triggered: g.blocked, verdict: parsed.call_ended ? decide(parsed.criteria, parsed.evidence) : null, usage };
}

export async function analyseTranscript(transcriptText: string) {
  const { parsed, usage } = await call(ANALYSE_SYSTEM, [{ role: "user", content: transcriptText }]);
  return { ...parsed, verdict: decide(parsed.criteria, parsed.evidence), usage };
}
