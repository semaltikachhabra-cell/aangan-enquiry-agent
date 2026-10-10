/**
 * Replay every transcript in data/transcripts.json through the analyser and compare with data/ground-truth.json.
 * Usage: ANTHROPIC_API_KEY=... npm run eval
 * Writes: data/eval-records.json (dashboard seed), docs/eval-results.md (the honest report).
 */
import fs from "node:fs";
import path from "node:path";
import { analyseTranscript, MODEL, GEMINI_MODEL, PROVIDER } from "../lib/agent";
import { costInr } from "../lib/cost";
import type { EnquiryRecord, Turn } from "../lib/types";

const root = process.cwd();
const T: { id: string; channel: "Phone" | "WhatsApp" | "Web Form"; minutes: number | null; text: string }[] = JSON.parse(fs.readFileSync(path.join(root, "data/transcripts.json"), "utf8"));
const GT = JSON.parse(fs.readFileSync(path.join(root, "data/ground-truth.json"), "utf8"));
const MONTH = new Date("2026-09-15T12:00:00+05:30");

function monthDate(text: string) {
  const m = text.match(/(\d{1,2})(?:–\d+)? (September|Sept)(?:\s*·\s*(\d{1,2}):(\d{2})(am|pm))?/);
  if (!m) return MONTH.toISOString();
  let h = m[3] ? +m[3] % 12 + (m[5] === "pm" ? 12 : 0) : 12;
  return new Date(`2026-09-${m[1].padStart(2, "0")}T${String(h).padStart(2, "0")}:${m[4] ?? "00"}:00+05:30`).toISOString();
}

async function main() {
  const records: EnquiryRecord[] = [];
  const rows: any[] = [];
  for (const t of T) {
    const g = GT[t.id];
    process.stdout.write(`${t.id} `);
    let a;
    for (let i = 0; i < 3 && !a; i++) { try { a = await analyseTranscript(t.text); } catch (e) { if (i === 2) throw e; } }
    if (PROVIDER() === "gemini") await new Promise((r) => setTimeout(r, 6000)); // stay under free-tier rate limits
    const got = a!.verdict.qualified ? "Q" : "N";
    const pass = g.expected === "NA" ? null : got === g.expected;
    const received = monthDate(t.text);
    const h = +new Date(received) + 5.5 * 3600e3;
    const hour = new Date(h).getUTCHours();
    const turns: Turn[] = [];
    for (const l of t.text.split("\n")) {
      const m = l.match(/^(Front Desk|Caller): (.*)/);
      if (m) turns.push({ role: m[1] === "Caller" ? "caller" : "agent", text: m[2] });
    }
    records.push({
      id: `replay-${t.id}`, transcriptId: t.id, channel: t.channel, source: "transcript-replay", receivedAt: received, respondedAt: received,
      responseSeconds: null, outsideOfficeHours: hour < 10 || hour >= 19, fields: a!.fields, criteria: a!.criteria, verdict: a!.verdict, turns,
      usage: a!.usage, durationMin: t.minutes ?? 0, costInr: costInr(a!.usage, 0, false).totalInr,
      handoff: { sent: false, channel: null, at: null },
    });
    rows.push({ id: t.id, channel: t.channel, expected: g.expected, got, pass, borderline: g.borderline, why: g.why, reason: a!.verdict.reason, unc: a!.verdict.uncertainty, intent: a!.intent, crit: a!.criteria });
  }
  fs.writeFileSync(path.join(root, "data/eval-records.json"), JSON.stringify(records, null, 1));

  const judged = rows.filter((r) => r.pass !== null);
  const ok = judged.filter((r) => r.pass);
  const clear = judged.filter((r) => !r.borderline);
  const clearOk = clear.filter((r) => r.pass);
  const phone = judged.filter((r) => r.channel === "Phone");
  const fails = judged.filter((r) => !r.pass);
  const fmt = (r: any) => `| ${r.id} | ${r.channel} | ${r.expected} | ${r.got} | ${r.borderline ? "yes" : ""} | ${r.reason.replace(/\|/g, "/")} |`;
  const md = `# Evaluation: agent vs my reading of qualified.md

Model: \`${PROVIDER() === "gemini" ? GEMINI_MODEL : MODEL}\` (${PROVIDER()}). Run: ${new Date().toISOString()}. Ground truth is **my own** reading of \`qualified.md\` + \`services.md\` (see \`data/ground-truth.json\` for the reason behind each label); it is not the studio's. ${rows.length - judged.length} records (${rows.filter((r) => r.pass === null).map((r) => r.id).join(", ")}) have too little content to judge and are excluded from accuracy.

| Slice | Correct | Of | Accuracy |
|---|---|---|---|
| All judgeable | ${ok.length} | ${judged.length} | ${Math.round((ok.length / judged.length) * 100)}% |
| Clear-cut only (not borderline) | ${clearOk.length} | ${clear.length} | ${Math.round((clearOk.length / clear.length) * 100)}% |
| Phone only (in scope) | ${phone.filter((r) => r.pass).length} | ${phone.length} | ${Math.round((phone.filter((r) => r.pass).length / phone.length) * 100)}% |

Note: the agent is shown the *finished* transcript and judges it. This tests the rubric logic and extraction, not how well the live agent would conduct the call. Live conduct is tested separately in the simulator.

## Failures (${fails.length})
| ID | Channel | Mine | Agent | Borderline | Agent's reason |
|---|---|---|---|---|---|
${fails.map(fmt).join("\n") || "| none | | | | | |"}

## All results
| ID | Channel | Mine | Agent | Borderline | Agent's reason |
|---|---|---|---|---|---|
${rows.map(fmt).join("\n")}
`;
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs/eval-results.md"), md);
  console.log(`\n${ok.length}/${judged.length} correct (${clearOk.length}/${clear.length} clear-cut). Report: docs/eval-results.md`);
}
main();
