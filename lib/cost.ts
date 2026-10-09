import type { Usage } from "./types";

// ASSUMPTIONS — none of these rates come from the case. Override in env from the real price sheets.
const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);
export const RATES = {
  llmInUsdPerMTok: num(process.env.LLM_INPUT_USD_PER_MTOK, 3),
  llmOutUsdPerMTok: num(process.env.LLM_OUTPUT_USD_PER_MTOK, 15),
  voiceUsdPerMin: num(process.env.VOICE_USD_PER_MIN, 0.1),
  usdInr: num(process.env.USD_INR, 88),
};

export function costInr(u: Usage, callMinutes: number, includeVoice: boolean) {
  const llmUsd = (u.input_tokens * RATES.llmInUsdPerMTok + u.output_tokens * RATES.llmOutUsdPerMTok) / 1e6;
  const voiceUsd = includeVoice ? callMinutes * RATES.voiceUsdPerMin : 0;
  return { llmInr: llmUsd * RATES.usdInr, voiceInr: voiceUsd * RATES.usdInr, totalInr: (llmUsd + voiceUsd) * RATES.usdInr };
}
