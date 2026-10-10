import fs from "node:fs";
import path from "node:path";
import { get, list, put } from "@vercel/blob";
import type { EnquiryRecord } from "./types";

// Production: private Vercel Blob store (set BLOB_READ_WRITE_TOKEN). Local: data/runtime/enquiries.json.
// (Vercel functions don't share a filesystem, so a plain file can't back the live dashboard.)
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const dir = path.join(process.cwd(), "data", "runtime");
const file = path.join(dir, "enquiries.json");

function readJson<T>(f: string, d: T): T {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; }
}

/** Committed results of the 40-transcript replay (scripts/eval.ts). Shown on the dashboard, labelled as replay. */
export function seeded(): EnquiryRecord[] {
  return readJson<EnquiryRecord[]>(path.join(process.cwd(), "data", "eval-records.json"), []);
}

export async function live(): Promise<EnquiryRecord[]> {
  if (!useBlob()) return readJson<EnquiryRecord[]>(file, []);
  try {
    const { blobs } = await list({ prefix: "enq/", limit: 200 });
    const recs = await Promise.all(blobs.map(async (b) => {
      const r = await get(b.pathname, { access: "private", useCache: false });
      if (!r || r.statusCode !== 200) return null;
      return JSON.parse(await new Response(r.stream).text()) as EnquiryRecord;
    }));
    return (recs.filter(Boolean) as EnquiryRecord[]).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  } catch (e) {
    console.error("blob read failed", e);
    return [];
  }
}

export async function saveLive(r: EnquiryRecord) {
  if (useBlob()) {
    await put(`enq/${r.id}.json`, JSON.stringify(r), { access: "private", contentType: "application/json", allowOverwrite: true, addRandomSuffix: false });
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  const all = readJson<EnquiryRecord[]>(file, []);
  const i = all.findIndex((x) => x.id === r.id);
  if (i >= 0) all[i] = r; else all.push(r);
  fs.writeFileSync(file, JSON.stringify(all, null, 1));
}

export const all = async () => [...seeded(), ...(await live())];
