# Evaluation: agent vs my reading of qualified.md

Model: `gemini-flash-lite-latest` (gemini). Run: 2026-10-10T05:43:40.795Z. Ground truth is **my own** reading of `qualified.md` + `services.md` (see `data/ground-truth.json` for the reason behind each label); it is not the studio's. 4 records (T08, W02, W05, F04) have too little content to judge and are excluded from accuracy.

| Slice | Correct | Of | Accuracy |
|---|---|---|---|
| All judgeable | 34 | 36 | 94% |
| Clear-cut only (not borderline) | 31 | 31 | 100% |
| Phone only (in scope) | 17 | 19 | 89% |

Note: the agent is shown the *finished* transcript and judges it. This tests the rubric logic and extraction, not how well the live agent would conduct the call. Live conduct is tested separately in the simulator.

## Failures (2)
| ID | Channel | Mine | Agent | Borderline | Agent's reason |
|---|---|---|---|---|---|
| T07 | Phone | Q | N | yes | timeline too short to execute (Caller initially wanted it done before Diwali (about three weeks away), which is under the minimum required timeline.) |
| T18 | Phone | Q | N | yes | not a real execution project (Commercial project is below our minimum scope (180 sq ft pod vs ~500 sq ft minimum for commercial projects).) |

## All results
| ID | Channel | Mine | Agent | Borderline | Agent's reason |
|---|---|---|---|---|---|
| T01 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T02 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T03 | Phone | N | N |  | outside Pune/PCMC (My name is Suresh Patil. I’m in Nashik — would you be able to take on a project here?) |
| T04 | Phone | N | N |  | not a real execution project (Caller stated: 'Just want suggestions on colours, furniture arrangement, what to change. We're not planning to do the full thing right now. Just exploring for now.') |
| T05 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T06 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T07 | Phone | Q | N | yes | timeline too short to execute (Caller initially wanted it done before Diwali (about three weeks away), which is under the minimum required timeline.) |
| T08 | Phone | NA | N |  | No usable enquiry content (e.g. missed call / no details given). |
| T09 | Phone | N | N |  | Existing client with a complaint about a running project — not a new lead; escalate to the studio head. |
| T10 | Phone | N | N |  | budget clearly too low for the scope (Caller volunteered a budget of 1 to 1.5 lakh maximum for a kitchen and bedroom redesign, which is clearly below the required scope cost.) |
| T11 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T12 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T13 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T14 | Phone | Q | Q | yes | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T15 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T16 | Phone | Q | Q | yes | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T17 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T18 | Phone | Q | N | yes | not a real execution project (Commercial project is below our minimum scope (180 sq ft pod vs ~500 sq ft minimum for commercial projects).) |
| T19 | Phone | N | N |  | not a real execution project (Caller stated: 'I’m planning to open a restaurant... Would you be able to design the interiors?') |
| T20 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W01 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W02 | WhatsApp | NA | N | yes | Too little information to forward (unconfirmed: real_project, service_area, timeline). |
| W03 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W04 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W05 | WhatsApp | NA | Q | yes | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W06 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W07 | WhatsApp | N | N |  | not a real execution project (The project type is a gym, which is explicitly listed as out of scope in the SERVICES document (gyms are not taken as primary projects).) |
| W08 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W09 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W10 | WhatsApp | N | N |  | Too little information to forward (unconfirmed: real_project, timeline). |
| F01 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| F02 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| F03 | Web Form | N | N |  | outside Pune/PCMC (Client states: 'Talegaon Dabhade, near Pune', which is explicitly listed in the SERVICES document as out of scope ('We do not currently serve Talegaon, Lonavala, Nashik, Mumbai, or other cities outside this area').) |
| F04 | Web Form | NA | N | yes | Too little information to forward (unconfirmed: real_project, timeline). |
| F05 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| F06 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| F07 | Web Form | N | N | yes | Too little information to forward (unconfirmed: real_project, timeline). |
| F08 | Web Form | N | N |  | timeline too short to execute (Timeline: 3 weeks maximum. Guests arriving from the US in 3 weeks.) |
| F09 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| F10 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |

## Honest notes on this result
- **Two runs.** Run 1 (`docs/eval-run1-before-fix.md`) scored 32/36 (29/31 clear-cut). It failed T19 (restaurant) and W07 (gym) because my criterion wording didn't tell the model that project types `services.md` rules out count against "real project". I fixed that wording and re-ran: 34/36. **That fix was made after seeing the test set**, so treat 94% as an optimistic figure; it is a regression suite for 40 known cases, not a measure of how it will do on unseen calls.
- **T18 is the desk's undocumented rule leaking in.** The agent saw the front desk say "~500 sq ft minimum for commercial" in the transcript and repeated it. That rule is in neither `services.md` nor `qualified.md`. A live agent never hears the desk, so it would not know the rule at all.
- **T07** is a genuine judgement call: the caller first wanted a 3-week job, then offered a post-Diwali start but didn't commit. A reasonable reader could go either way.
- Excluded as unjudgeable: T08 (missed call), W02, W05, F04 (too little content).
- This tested classification of *finished* records on one model (`gemini-flash-lite-latest`, free tier). Live call behaviour is tested separately in the simulator.
