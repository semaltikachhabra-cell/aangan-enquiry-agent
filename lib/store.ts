import fs from "node:fs";
import path from "node:path";
import type { EnquiryRecord } from "./types";

// Local: data/runtime/enquiries.json. Vercel: /tmp (ephemeral). Swap for Supabase/Neon in production (see README).
const dir = process.env.VERCEL ? "/tmp/aangan" : path.join(process.cwd(), "data", "runtime");
const file = path.join(dir, "enquiries.json");

function readJson<T>(f: string, d: T): T {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; }
}

/** Committed results of the 40-transcript replay (scripts/eval.ts). Shown on the dashboard, labelled as replay. */
export function seeded(): EnquiryRecord[] {
  return readJson<EnquiryRecord[]>(path.join(process.cwd(), "data", "eval-records.json"), []);
}
export function live(): EnquiryRecord[] {
  return readJson<EnquiryRecord[]>(file, []);
}
export function saveLive(r: EnquiryRecord) {
  fs.mkdirSync(dir, { recursive: true });
  const all = live();
  const i = all.findIndex((x) => x.id === r.id);
  if (i >= 0) all[i] = r; else all.push(r);
  fs.writeFileSync(file, JSON.stringify(all, null, 1));
}
export const all = () => [...seeded(), ...live()];
