import type { EnquiryRecord } from "./types";

/**
 * Handoff channel: Telegram.
 * Why: instant (seconds), free, push-notifies the designer's phone, supports one message per lead with the full
 * brief, designers are likely on mobile and reading WhatsApp-style chat anyway, and setup is one bot token.
 * Email was rejected: slower to be seen, lands in a crowded inbox, and needs a domain/SPF setup to avoid spam.
 */
const esc = (s: unknown) => String(s ?? "—").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

export function formatBrief(r: EnquiryRecord) {
  const f = r.fields;
  const lines = [
    `🏠 <b>New qualified enquiry</b> — ${esc(f.project_type)}`,
    ``,
    `<b>Name:</b> ${esc(f.name)}`,
    `<b>Call back:</b> ${esc(f.callback_number)}`,
    `<b>Location:</b> ${esc(f.location)}`,
    `<b>Area:</b> ${f.area_sqft ? esc(f.area_sqft) + " sq ft" : "—"}`,
    `<b>Timeline:</b> ${esc(f.timeline)}`,
    `<b>Budget (caller's words):</b> ${esc(f.budget ?? "not mentioned")}`,
    `<b>Ownership / site:</b> ${esc(f.ownership)}`,
    `<b>Referral:</b> ${esc(f.referral)}`,
    ``,
    `<b>Why qualified:</b> ${esc(r.verdict.reason)}`,
    r.verdict.uncertainty ? `<b>⚠ Confirm at consultation:</b> ${esc(r.verdict.uncertainty)}` : "",
    f.notes ? `<b>Notes:</b> ${esc(f.notes)}` : "",
    ``,
    `<i>Already asked on the call — please don't re-ask these. Pricing was NOT discussed; no figure was given.</i>`,
    `Enquiry ${r.id} · answered in ${r.responseSeconds}s${r.outsideOfficeHours ? " · after hours" : ""}`,
  ];
  return lines.filter((l) => l !== "" || true).join("\n");
}

export async function sendHandoff(r: EnquiryRecord): Promise<EnquiryRecord["handoff"]> {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  const at = new Date().toISOString();
  if (!token || !chat) return { sent: true, channel: "dry-run", at };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: formatBrief(r), parse_mode: "HTML" }),
    });
    if (!res.ok) return { sent: false, channel: "telegram", at, error: `telegram ${res.status}` };
    return { sent: true, channel: "telegram", at };
  } catch (e) {
    return { sent: false, channel: "telegram", at, error: String(e) };
  }
}
