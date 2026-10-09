export type Tri = "pass" | "fail" | "unclear";
export interface Criteria {
  real_project: Tri;
  service_area: Tri;
  timeline: Tri;
  budget: Tri;
  decision_maker: Tri;
}
export interface Fields {
  name: string | null;
  callback_number: string | null;
  project_type: string | null; // e.g. "3BHK full home", "office fitout", "single room"
  location: string | null;
  area_sqft: number | null;
  budget: string | null; // only what the caller volunteered, verbatim
  timeline: string | null;
  ownership: string | null; // owner / tenant / buying, and site status
  referral: string | null;
  notes: string | null;
}
export interface Verdict {
  qualified: boolean;
  reason: string; // one line
  uncertainty: string | null; // unclear budget/decision-maker, noted for the designer
}
export interface Turn {
  role: "caller" | "agent";
  text: string;
}
export interface Usage {
  input_tokens: number;
  output_tokens: number;
}
export interface EnquiryRecord {
  id: string;
  source: "live-sim" | "vaani" | "transcript-replay";
  receivedAt: string; // ISO
  respondedAt: string; // ISO — first agent reply
  responseSeconds: number;
  outsideOfficeHours: boolean;
  fields: Fields;
  criteria: Criteria;
  verdict: Verdict;
  turns: Turn[];
  usage: Usage;
  durationMin: number;
  costInr: number;
  handoff: { sent: boolean; channel: "telegram" | "dry-run" | null; at: string | null; error?: string };
  transcriptId?: string; // T01.. for replays
}
