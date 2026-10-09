import fs from "node:fs";
import path from "node:path";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), "data", f), "utf8");

/** services.md and qualified.md go to the model verbatim. */
export const SERVICES = read("services.md");
export const QUALIFIED = read("qualified.md");

/**
 * pricing.md is deliberately NOT loaded into the model's context.
 * The file says no number from it may ever be quoted, so the safest guard is
 * that the agent never sees the numbers. Only the approved deflection line is used.
 */
export const PRICING_DEFLECTION =
  "Pricing depends on the site, the materials you choose, and the scope — your designer will walk you through it in detail at the consultation. I can book that for you right now if you'd like.";
