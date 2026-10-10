# 3. Components Map — Trigger → Input → Context → Processing → AI → Output

```
 ┌───────────┐   ┌─────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────┐   ┌────────────────────────┐
 │  TRIGGER  │ → │    INPUT    │ → │     CONTEXT      │ → │    PROCESSING    │ → │          AI          │ → │         OUTPUT         │
 │ Incoming  │   │ Caller's    │   │ services.md      │   │ per-turn loop,   │   │ Claude              │   │ Spoken reply (Vaani    │
 │ phone call│   │ speech →    │   │ qualified.md     │   │ price guard,     │   │ (claude-sonnet-5-5)  │   │ TTS) · Telegram brief  │
 │ (any hour)│   │ text (STT)  │   │ (NOT pricing.md) │   │ rubric → verdict │   │ JSON per turn        │   │ · dashboard record     │
 └───────────┘   └─────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────────┘   └────────────────────────┘
```

| Stage | What it is here | Where in the code |
|---|---|---|
| **Trigger** | A call arrives on the studio number, at any hour. In the demo: "Start call" in the simulator. In production: Vaani receives the call and POSTs each turn to our webhook. | `app/call/page.tsx`, `app/api/vaani/route.ts`, `lib/channels/vaani.ts` |
| **Input** | What the caller says, already transcribed (Vaani STT in production, typed text in the sim); the caller-ID number (Vaani) pre-fills the callback number; the call's start time (for after-hours tagging). | `lib/channels/vaani.ts` (`historyFromVaani`) |
| **Context** | `services.md` (what the studio does / doesn't do, service area, scope limits) and `qualified.md` (Nikhil's five criteria and the boundary rules) are given to the model verbatim. **`pricing.md` is deliberately withheld**: it forbids quoting, so the agent never sees a number. Only the approved deflection sentence is in the prompt. | `lib/knowledge.ts` |
| **Processing** | (1) Each turn: send the running conversation to the model. (2) **Price guard**: any reply that contains a currency/per-sq-ft figure is replaced by the deflection. (3) The model reports each of the five criteria as pass / fail / unclear with its evidence. (4) **The verdict is computed in code** (`decide()`): any fail → not qualified with a one-line reason; unclear budget or decision-maker → qualified with a "confirm at consultation" note (as `qualified.md` instructs); existing-client complaint → escalate. (5) On call end, cost is computed and the record stored. | `lib/session.ts`, `lib/agent.ts` (`decide`, `guardPrice`), `lib/cost.ts`, `lib/store.ts` |
| **AI** | One Claude call per turn returns JSON: the spoken reply, extracted fields (name, number, project type, location, area, budget-as-stated, timeline, ownership, referral), the five criteria, evidence and a call-ended flag. Judgement lives here; the *decision* does not. | `lib/agent.ts` |
| **Output** | (a) The spoken reply, back to the caller via Vaani TTS. (b) For qualified calls: one Telegram message to the designer with everything already asked and a "do not re-ask" line. (c) A record on the founder dashboard: response time, verdict + reason, handoff status, LLM + voice cost. | `lib/handoff.ts`, `app/dashboard/page.tsx`, `app/api/enquiries/route.ts` |

## Why Telegram for the handoff (not email)
- **Speed:** a push notification on the designer's phone within seconds; email lands in a crowded inbox and is read when convenient.
- **One-message brief:** the whole structured summary fits in a single scannable message.
- **Setup:** one bot token and a chat id; no domain, SPF/DKIM or deliverability setup. (Email would also need a sender domain to avoid spam folders.)
- **Fit:** designers are on-site and on their phones. [Assumed] — not stated in the case.
- Trade-off: Telegram is not the studio's current tool (they use WhatsApp). A WhatsApp Business handoff is the natural next step but needs Meta template approval, which is too slow for this build.

## How the same core extends to the other channels (out of scope; noted for the write-up)
The core, `processTurn()` + `finalizeCall()`, is channel-agnostic. Only Trigger and Input/Output change:
- **WhatsApp:** Meta Cloud API webhook → the same `processTurn()` with the thread as history; the reply goes back as a WhatsApp message. The after-hours gap in W01, W05, W09 is exactly what this closes. Needs template messages for the first outbound contact.
- **Web form:** the form POST triggers the same pipeline on a pre-filled history (the form's fields map straight onto our `Fields`); if a field the rubric needs is missing (F04, F07), the agent replies by email/WhatsApp with one direct question. F03 (Talegaon) and F08 (3-week timeline) show the form can be qualified instantly.
