# Aangan Studio — Phone Enquiry Agent

Case Study 3 (AI and its Application, Mesa School of Business): *"Nikhil: Unanswered Enquiries"*.
An AI agent that answers every incoming call instantly, asks what the designers always ask, applies the founder's own five-point rubric, hands qualified leads to a designer on Telegram with everything pre-asked, and feeds a founder dashboard that shows what the system costs against what it generates.

**Live demo:** https://aangan-enquiry-agent-nu.vercel.app (`/call` to simulate a call, `/dashboard` for the founder view)
**Eval:** 34/36 judgeable transcripts correct, 31/31 clear-cut (see `docs/eval-results.md` for failures and caveats)

**Scope:** incoming phone calls only (WhatsApp / web form: see "Extending" below).
**Docs:** [`docs/1-automation-brief.md`](docs/1-automation-brief.md) · [`docs/2-nine-checks.md`](docs/2-nine-checks.md) (incl. *the Cut*) · [`docs/3-components-map.md`](docs/3-components-map.md) · [`docs/eval-results.md`](docs/eval-results.md)

## The one decision to know about
Nikhil asked for the system to quote per-sq-ft pricing. His own `pricing.md` says *"No number from this guide should be quoted to a client."* So **the agent never quotes a price**: it gives the approved deflection and books the consultation. `pricing.md` is not loaded into the model's context, and a guard rewrites any reply containing a figure. This is "the Cut" (see the Nine Checks).

## Setup
```bash
npm install
cp .env.example .env.local   # then fill in ANTHROPIC_API_KEY (and optionally Telegram)
npm run dev                  # http://localhost:3000  → /call and /dashboard
npm run eval                 # replays all 40 transcripts → docs/eval-results.md + data/eval-records.json
```
Environment variables (never committed; `.env*` is git-ignored):

| Var | Purpose |
|---|---|
| `GEMINI_API_KEY` | **Free LLM option used for this submission** (model `gemini-flash-lite-latest`, ~2 s/turn). Created at aistudio.google.com/apikey, no card. Free-tier latency varies (1–30 s on larger models). |
| `ANTHROPIC_API_KEY` | Alternative provider (model `claude-sonnet-5-5`, as the brief specified). Used automatically if set; deviation from the brief was because the project had no API budget |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Designer handoff. Unset → **dry-run** (recorded on the dashboard, nothing sent) |
| `LLM_INPUT_USD_PER_MTOK`, `LLM_OUTPUT_USD_PER_MTOK`, `VOICE_USD_PER_MIN`, `USD_INR` | **Assumed** cost rates (not in the case); set from the real price sheets |
| `VAANI_WEBHOOK_SECRET` | Shared secret for the Vaani webhook stub |

Telegram: create a bot with @BotFather, send it a message, then read your chat id from `https://api.telegram.org/bot<TOKEN>/getUpdates`.

## Architecture
```
caller ──► [Vaani: phone number + STT + TTS]  (or the /call simulator)
              │ text, each turn
              ▼
        POST /api/vaani  ─┐                 lib/session.ts  processTurn()  ◄── channel-agnostic core
        POST /api/call   ─┴────────────────► lib/agent.ts   Claude → {reply, fields, 5 criteria}
                                               │  price guard on every reply
                                               │  decide(): verdict computed in code from the criteria
                                               ▼
                                      finalizeCall(): cost → store → Telegram handoff (qualified only)
                                               ▼
                                      /dashboard  (reads /api/enquiries)
```
- **Verdict logic:** the model judges each criterion in `qualified.md` as pass/fail/unclear; `decide()` applies the rubric's rules deterministically (any fail → decline with a one-line reason; unclear budget or decision-maker → qualified with a "confirm at consultation" note).
- **Handoff = Telegram.** Instant push to the designer's phone, one-message structured brief, one bot token to set up. Email: slower to be seen, needs a sender domain. WhatsApp: the studio's real channel but needs Meta template approval.
- **Dashboard:** enquiries handled, median first-response time, qualified vs not, handoffs sent, LLM + voice cost per enquiry and total, versus *qualified × conversion % × project value* (₹8–14 lakh from the case; conversion % is **an editable assumption**, default 10%, not from the case).

## Extending to WhatsApp and the web form (not built)
`processTurn()` / `finalizeCall()` don't know about phones. Add a channel by writing a thin adapter like `lib/channels/vaani.ts`:
- **WhatsApp:** Meta Cloud API webhook → thread as history → reply as a message. Closes the after-hours gaps (W01, W05, W09). Needs approved template for first outbound contact.
- **Web form:** form POST → pre-filled `Fields` → the same rubric; if a needed field is missing (F04, F07), send one direct question by WhatsApp/email.

## Guardrails (tested)
- **No prices:** `pricing.md` never reaches the model; a regex guard rewrites any reply containing a figure.
- **No invented phone numbers:** found in testing: the model once fabricated a callback number. `numberIsReal()` now discards any number whose digits don't appear in the caller's own words, and the call can't end (for a qualified lead) until a real number is captured.
- **Verdict in code:** the model only judges each criterion; `decide()` applies the rubric.

## Known limitations (be upfront about these)
1. **Vaani is a stub.** No Vaani credentials/payload schema were available; `lib/channels/vaani.ts` assumes a payload shape. The live demo is a **text-simulated call**. Real voice adds latency and STT errors (numbers, Hindi/Marathi mixing: see W03) that are untested here.
2. **Eval is a replay, not a live test.** The agent reads the *finished* transcripts and judges them. That tests the rubric and extraction, not how well it conducts a call. The ground truth is *my* reading of `qualified.md`, not the studio's; 8 of 40 labels are borderline and 4 records can't be judged (see `docs/eval-results.md`).
3. **Live records need a Blob store.** Production uses a private Vercel Blob store (`BLOB_READ_WRITE_TOKEN`, created in the Vercel Storage tab). Without it, records go to a local JSON file, which Vercel functions do not share, so the live dashboard would stay empty. The 40-transcript replay is committed so the dashboard is never empty.
4. **Cost numbers are assumptions** (token and voice rates), and replay rows have no agent response time (they were human-desk calls), so *response time* is only meaningful on live/sim calls.
5. **Conversion rate is assumed**; pipeline value is pipeline, not revenue.
6. **No booking/calendar integration.** The agent offers a consultation; it doesn't write to a calendar.
7. **Undocumented human rules aren't known to the agent** (e.g. T18's "500 sq ft commercial minimum"): it only follows `services.md` / `qualified.md`.
8. **Privacy:** call transcripts and phone numbers are stored. Needs a retention policy and consent/recording notice before real use (India's DPDP Act).

## 60-second demo script (for the video)
1. **0:00 – 0:08** Open `/dashboard`. *"Aangan Studio gets ~200 enquiries a month; 48% go unanswered for 48 hours. This is Nikhil's dashboard, populated with September's real calls."*
2. **0:08 – 0:30** Go to `/call` → *Start call*. Agent answers instantly. Type: *"Hi, I'm Priya, 3BHK in Kothrud, about 1,400 sq ft, want to redo the whole flat."* … *"We own it, my husband's fine with it, done by March."* … *"9800000000. How much would it cost roughly?"* — point out the agent **refuses to quote** and offers the consultation. *"That's the Cut: his own pricing guide forbids quoting."*
3. **0:30 – 0:42** Show the right panel: fields filled, five criteria, **QUALIFIED**, one-line reason, *Handoff: sent via telegram*. Cut to the Telegram message: *"Everything's already asked, so the designer won't re-ask."*
4. **0:42 – 0:50** Restart; type *"I'm in Nashik"* → polite decline with reason.
5. **0:50 – 1:00** Back to `/dashboard`: handled / response time / qualified vs not / **running cost per enquiry vs pipeline** (edit the conversion % live). *"Nikhil no longer pulls these by hand."*

## Deploy (Vercel)
Push to GitHub (public repo), import into Vercel, add the env vars above, deploy.
