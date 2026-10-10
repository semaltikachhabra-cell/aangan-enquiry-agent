# Evaluation: agent vs my reading of qualified.md

Model: `gemini-flash-lite-latest` (gemini). Run: 2026-10-10T05:39:28.131Z. Ground truth is **my own** reading of `qualified.md` + `services.md` (see `data/ground-truth.json` for the reason behind each label); it is not the studio's. 4 records (T08, W02, W05, F04) have too little content to judge and are excluded from accuracy.

| Slice | Correct | Of | Accuracy |
|---|---|---|---|
| All judgeable | 32 | 36 | 89% |
| Clear-cut only (not borderline) | 29 | 31 | 94% |
| Phone only (in scope) | 16 | 19 | 84% |

Note: the agent is shown the *finished* transcript and judges it. This tests the rubric logic and extraction, not how well the live agent would conduct the call. Live conduct is tested separately in the simulator.

## Failures (4)
| ID | Channel | Mine | Agent | Borderline | Agent's reason |
|---|---|---|---|---|---|
| T07 | Phone | Q | N | yes | timeline too short to execute (Caller initially needed it done before Diwali (three weeks away), which fails the required timeline.) |
| T18 | Phone | Q | N | yes | Too little information to forward (unconfirmed: service_area, timeline). |
| T19 | Phone | N | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W07 | WhatsApp | N | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |

## All results
| ID | Channel | Mine | Agent | Borderline | Agent's reason |
|---|---|---|---|---|---|
| T01 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T02 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T03 | Phone | N | N |  | outside Pune/PCMC (I'm in Nashik — would you be able to take on a project here?) |
| T04 | Phone | N | N |  | not a real execution project (Caller states: "can someone come and give us some ideas for our living room? We're not planning to do the full thing right now. Just want suggestions on colours, furniture arrangement, what to change.") |
| T05 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T06 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T07 | Phone | Q | N | yes | timeline too short to execute (Caller initially needed it done before Diwali (three weeks away), which fails the required timeline.) |
| T08 | Phone | NA | N |  | No usable enquiry content (e.g. missed call / no details given). |
| T09 | Phone | N | N |  | Existing client with a complaint about a running project — not a new lead; escalate to the studio head. |
| T10 | Phone | N | N |  | budget clearly too low for the scope (My budget is 1 to 1.5 lakh maximum for everything.) |
| T11 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T12 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T13 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T14 | Phone | Q | Q | yes | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T15 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T16 | Phone | Q | Q | yes | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T17 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T18 | Phone | Q | N | yes | Too little information to forward (unconfirmed: service_area, timeline). |
| T19 | Phone | N | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| T20 | Phone | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W01 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W02 | WhatsApp | NA | N | yes | No usable enquiry content (e.g. missed call / no details given). |
| W03 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W04 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W05 | WhatsApp | NA | Q | yes | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W06 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W07 | WhatsApp | N | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W08 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W09 | WhatsApp | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| W10 | WhatsApp | N | N |  | Too little information to forward (unconfirmed: real_project, timeline). |
| F01 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| F02 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| F03 | Web Form | N | N |  | outside Pune/PCMC (Caller states: 'Location: Talegaon Dabhade, near Pune' and 'I know Talegaon is a bit outside Pune — wanted to check if you can still take up the project.' Service area excludes Talegaon.) |
| F04 | Web Form | NA | N | yes | Too little information to forward (unconfirmed: real_project, timeline). |
| F05 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| F06 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| F07 | Web Form | N | N | yes | not a real execution project (The person is only asking for a per sq ft rate and price list before deciding whether to enquire further, rather than requesting design and execution for a real project.) |
| F08 | Web Form | N | N |  | timeline too short to execute (The caller states 'Timeline: 3 weeks maximum' and 'Guests arriving from the US in 3 weeks', which is below the minimum lead time of 6-8 weeks.) |
| F09 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
| F10 | Web Form | Q | Q |  | Passes all five criteria (real project, Pune/PCMC, realistic timeline, budget not clearly misaligned, decision-maker present or represented). |
