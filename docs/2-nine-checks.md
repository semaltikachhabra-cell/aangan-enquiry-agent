# 2. The Nine Checks — Nikhil: Unanswered Enquiries

> **Note on the list.** I reconstructed the nine from the class-recording notes (Mihir Session 4, the AI resume-screener case): 1 Is the problem real · 2 Is the workflow repeated · 3 Is the input available · 4 Is the output clear · 5 Is the impact measurable · 6 Failure risk · 7 Is judgment protected · 8 Is the owner clear · 9 Is accountability needed. The notes say "the cut comes mainly from checks 6 and 9", which fits that numbering. The notes name "ROI" as a check alongside 5; I folded it into check 5. **If your slide numbers or wording differ, rename the headings; the evidence below is unaffected.**

Evidence key as in the Automation Brief.

| # | Check | Verdict | Evidence |
|---|---|---|---|
| 1 | Is the problem real? | **Yes** | [Case] ~48% of ~200 monthly enquiries unanswered in 48h; 4x conversion if answered in 1h. T08, T16, W05, W08. |
| 2 | Is the workflow repeated? | **Yes** | [Case] ~200/month. In the pack, 20 phone calls alone follow the same pattern: greet → project → area → timeline → ownership → decide. |
| 3 | Is the input available? | **Yes** | `services.md`, `qualified.md`, `pricing.md`, and 40 real transcripts. Caller's speech via the telephony layer (Vaani). |
| 4 | Is the output clear? | **Yes** | One structured brief per qualified call (name, number, project type, location, area, timeline, ownership, budget-as-stated, why-qualified, what-to-confirm) + a one-line reason for every decline. |
| 5 | Is the impact measurable (and worth it)? | **Yes, with a caveat** | Measurable: first-response time, enquiries handled, qualified/not, handoffs, cost per enquiry. Worth it: [Case] ₹8–14 lakh per project; one extra converted project covers many months of running cost. **Caveat:** the case gives no conversion rate, only "4x if within an hour". The dashboard takes it as an editable assumption and labels pipeline value as pipeline, not revenue. |
| 6 | Failure risk — what does a wrong answer cost? | **Asymmetric; designed around** | *False "qualified"* (a bad lead reaches a designer): costs a designer's call. *False "not qualified"* (a good lead declined): loses ₹8–14 lakh and is invisible. *Worst failure of all:* the agent states a price or promises something the studio doesn't do. Mitigations: criteria are judged per-rubric and the verdict is computed in code, not by the model; unclear budget/decision-maker is treated as qualified with a note (as `qualified.md` says); every decline gets a logged one-line reason for review; pricing is blocked structurally (see the Cut). |
| 7 | Is judgment protected? | **Yes** | The agent does not decide scope, price, style or whether to take the project; the designer does at the consultation (`qualified.md`: "the designer establishes fit at the consultation"). The agent only applies the founder's own five written criteria. |
| 8 | Is the owner clear? | **Yes for qualified leads, no for declines** | Qualified lead: the assigned designer owns it from the Telegram brief. Declined/auto-closed enquiries have **no human owner** — "we cannot blame AI". Mitigation: every decline is logged with its reason on the dashboard for Nikhil to audit; existing-client complaints (T09) are routed to the studio head rather than closed. |
| 9 | Is accountability needed? | **Yes, for pricing and for declines** | A wrong price from the agent becomes a commitment the studio is judged on; a wrongful decline loses a lead nobody notices. So accountability is kept with people: price comes only from the designer; declines are auditable. |

## The Cut — the thing someone wanted that a check says NOT to build

**Nikhil's third ask: "the system should be able to quote our standard per-square-foot pricing so people don't have to wait for that."** (My brief also repeated this as "quote indicative per-sq-ft pricing".)

**Which checks cut it:** 6 (failure risk) and 9 (accountability), supported by 7 (judgment protected).

**Why, from his own documents:**
- `pricing.md` is headed "indicative only… varies by site", and then says: *"No number from this guide should be quoted to a client."* Its "What the agent must never say" list prohibits any range or per-sq-ft figure, "It'll cost around…", "Our rates start at…", and "For a 2BHK it's typically…". The only approved answer is the deferral to the consultation.
- The front desk already does exactly this: T02 ("I genuinely can't — it varies quite a bit"), T13 ("the difference between a standard and a premium kitchen alone can be 3x the cost"), W02, and the form F07 ("please email me the price list").
- Pricing is the highest-stakes output (check 6) and it has no clear automatable owner other than the designer (checks 8, 9): an AI-spoken range is a verbal quote the studio would be held to.
- `qualified.md` agrees from the other side: asking for pricing "does NOT disqualify" — so deflecting costs us no leads.

**What we build instead:** the agent *always* answers a price question with the approved deflection and offers to book the consultation right now; it never sees the numbers (`pricing.md` is not loaded into the model's context at all, and a regex guard rewrites any reply containing a figure). It still answers the *need* behind the ask — "don't make people wait" — by booking the consultation instantly.

**Trade-off I'm accepting:** some price-shopping callers (W02, F04, F07 show the pattern) will not convert on a deflection. That is the cost of not putting a number in the studio's mouth. If Nikhil wants to revisit it, the safe route is a *designer-approved* range per project type, not the internal guide.

### Smaller things noticed (not the Cut)
- Undocumented rule: in T18 the desk declined a 180 sq ft pod citing a 500 sq ft minimum for commercial. Neither `services.md` nor `qualified.md` says it. The agent can only follow what is written, so this needs adding to the documents.
- Existing-client complaints (T09, T16, W08) are not new enquiries and are not covered by the rubric; the agent flags them for escalation rather than qualifying them.
