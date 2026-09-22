# Activity file schema

One activity per file: `data/activities/<id>.json`. `node scripts/validate.js` must pass.

Every activity is aligned to one or more **TCEA ELE indicators** (see `data/eles.json`)
and to at least one **literacy strand**. Every activity ships **print-ready handouts**,
so it runs in a room with no devices, and says how it runs digitally.

```jsonc
{
  "id": "lateral-reading-relay",            // kebab-case, = filename, unique
  "title": "Lateral Reading Relay",
  "tagline": "One sentence: what participants do and why it matters.",
  "audience": "pl",                          // "pl" = adult professional learning | "student"
  "roles": ["teachers", "librarians"],       // PL only: teachers | librarians | coaches | leaders | faculty (higher ed) | staff
  "grades": ["6-8", "9-12"],                 // student: K-2 | 3-5 | 6-8 | 9-12 | Higher Ed.
                                             // PL: the grade levels the participants serve, e.g. ["K-12","Higher Ed"]
  "strands": ["medialit", "genai"],          // 1+ of: genai | digcit | medialit
  "mode": "hybrid",                          // primary mode: unplugged | digital | hybrid
  "minutes": 45,                             // total run time (integer)
  "groupSize": "Teams of 3–4; any number of teams",
  "eles": ["T2.1", "T2.3", "AI4.2"],         // indicator ids, most relevant first. 1–5.
  "overview": "2–4 sentences. What happens, the big idea, why it matters now.",
  "objectives": ["Participants will …", "…"],                 // 2–4, observable
  "materials": {
    "print":   ["Handout A: Claim Cards (1 set per team, cut apart)", "Chart paper, markers"],
    "digital": ["Any device with a browser (1 per team)", "Optional: a generative AI chatbot the district approves"]
  },
  "prep": ["Print and cut …", "…"],                            // 1–5 facilitator prep steps
  "steps": [                                                   // 4–8 steps; minutes should sum to ~minutes
    {
      "phase": "Hook",                     // Hook | Explore | Model | Practice | Apply | Create | Debrief | Reflect | Transfer
      "minutes": 5,
      "title": "The 60-second gut check",
      "body": "What the facilitator does and says, and what participants do. Concrete. May contain **bold**, *italic*, and \"quoted scripts\".",
      "note": "Optional facilitator tip, a likely misconception, or a look-for."
    }
  ],
  "unplugged": "How to run the whole thing with zero devices (required even for digital activities, may be a partial adaptation).",
  "digital": "How to run it with devices / online / in an LMS (required even for unplugged ones).",
  "whyTech": "1–2 sentences: what the digital/AI path adds to the evidence of learning that paper cannot, or why this one is better unplugged.",
  "adaptations": [                                              // 2–4 short ones
    { "label": "K–2", "text": "…" },
    { "label": "Higher Ed", "text": "…" },
    { "label": "Emergent bilinguals", "text": "…" }
  ],
  "lookFors": ["Observable evidence that the learning happened", "…"],   // 2–4
  "reflection": ["Guiding question tied to the ELE guiding questions", "…"], // 2–4
  "transfer": "For PL: what the educator does with students next week. For student activities: how it connects to the next lesson or home. 1–3 sentences.",
  "connections": [                                               // 0–3, ONLY from the approved link list below
    { "title": "Digital Citizenship Breakouts", "url": "https://mglearn.github.io/activities/digcit/", "note": "Grade 6–8 media-spin breakout pairs well as a follow-up." }
  ],
  "handouts": [ /* 1–3 handout blocks, see below */ ]
}
```

## Design principles (from the updated ELEs, TCEA blog, Dec 2026 — `source_materials/blog2026.md`)

The 2026 update asks one question: **"What does good learning look like today?"** Build every activity around it.

- **Technology use by itself is not evidence of learning.** Start from the evidence you want (claims, reasoning, revisions, decisions), then choose the tool, or no tool, that makes that thinking visible. With current pressure to limit screen time, an unplugged path is a feature, not a fallback.
- Every activity answers: **"What evidence shows the technology (or AI) improved the learning?"** Put that evidence in `lookFors`, and say in `whyTech` why the digital path earns its screen time.
- **Students move from tool users to learning owners.** They explain why they chose a format, how they protected personal information, and what they changed after feedback.
- **Coaches** work the cycle **listen, co-plan, model, measure, adjust**. The coaching question: "What changed in teacher practice or student evidence?"
- **Leaders** run the five-question check: *What is the vision? What evidence will guide us? What changes in instruction? Who might be left out? How will families understand the change?*
- **AI cuts across every role.** The value comes when learners question, verify, and decide. Be honest about where AI belongs, *if it belongs at all*.

## Handout blocks

Handouts print on US Letter. Each has `id` ("A", "B", "C"), `title`, `type`,
optional `instructions` (1–2 sentences printed at the top), plus type-specific fields.
Write the **complete** content — real claims, real scenarios, real prompts — never
placeholders like "insert example here".

| type | fields | renders as |
|---|---|---|
| `cards` | `cards: [{ "label": "optional small caps tag", "front": "text", "back": "optional answer/explanation (printed on a separate facilitator key)" }]` 6–16 | cut-apart cards, 8 per page |
| `sort` | `categories: ["…","…"]` (2–4), `items: [{ "text": "…", "answer": "category name", "why": "one-line rationale" }]` 6–16 | sorting mat + cut-apart item strips + facilitator key |
| `worksheet` | `sections: [{ "prompt": "…", "lines": 3 }]` 3–8 (lines 1–8); optional `boxes: true` on a section for a drawing box instead of lines | fill-in worksheet |
| `table` | `columns: ["…"]` 2–5, `rows: [["…","…"]]` pre-filled rows (may be empty strings for blanks), optional `blankRows: n` | organizer / matrix |
| `checklist` | `items: ["…"]` 5–14, optional `scale: ["Yes","Partly","No"]` | checklist / self-assessment |
| `reading` | `paragraphs: ["…"]` 2–10 — a scenario, mock article, mock AI output, mock social post, case study | a printed text to annotate |
| `rubric` | `levels: ["Beginning","Developing","Proficient","Exemplary"]`, `criteria: [{ "name": "…", "descriptors": ["…","…","…","…"] }]` 3–5 | scoring rubric |

## Strand meaning

- **genai** — Generative AI literacy: how models work (prediction from patterns), hallucination and verification, bias, prompting, disclosure and academic integrity, privacy with AI tools, human judgment in the loop.
- **digcit** — Digital citizenship: privacy and personal data, digital footprint, safety, security/phishing, respectful communication, copyright/fair use and credit, balance and wellbeing, inclusion and access.
- **medialit** — Media / news / information literacy: lateral reading, SIFT (Stop, Investigate the source, Find better coverage, Trace claims to the original context — Mike Caulfield), purpose and bias, manipulated and synthetic media, algorithms and feeds, primary vs secondary sources, persuasion techniques, making media responsibly.

## Content rules

1. **No fabricated facts.** Do not invent statistics, studies, quotes, or real-world incidents. Mock articles/posts/AI outputs are fine and expected, but must be clearly fictional (fictional towns, people, brands — e.g. "Maple Hollow ISD", "BrightPath Learning App"). Don't put real people or real companies in fictional scenarios.
2. **Tool-agnostic.** Say "a generative AI chatbot your district approves", not a brand. Never require student accounts on a consumer AI tool; for students under 13 the teacher drives any AI tool on a projector.
3. **Physical and digital.** Every activity must work unplugged with the handouts. Favor movement, cards, sorting, gallery walks, role-play, and discussion structures.
4. **K–16 honest.** Grade bands and language must fit the audience. PL activities should model the student experience ("do it as learners, then debrief as teachers") wherever sensible.
5. **Texas-friendly but universal.** You may mention TEKS / TEA in passing; don't depend on them.
6. **Voice:** warm, practical, direct, second person to the facilitator. American spelling. En dashes for ranges (K–2, 10–15 min).

## Approved connection links (use only these, only when genuinely relevant)

| Title | URL |
|---|---|
| TCEA ELEs (PDF) | https://tinyurl.com/tceaeles1 |
| TCEA ELEs Alignment Assistant | https://mglearn.github.io/tcea/eles/ |
| Digital Citizenship Breakouts (K–8) | https://mglearn.github.io/activities/digcit/ |
| Gen AI Literacy Breakouts (K–8) | https://mglearn.github.io/activities/genailit/ |
| Critical Thinking Breakouts: Signal Check, The Viral Claim (6–8 media literacy) | https://mglearn.github.io/activities/ctobs/clear/ |
| CLEAR Crew Detective Thinking Game | https://mglearn.github.io/tcea/clear/ |
| Family App Privacy Audit | https://mglearn.github.io/tcea/privacy-audit/ |
| CYBERSMART Ready: Educator Cybersecurity Tabletop | https://mglearn.github.io/tcea/cybersmart/ |
| When Disaster Strikes: Cyber Incident Response Game | https://mglearn.github.io/tcea/wds/ |
| Generative AI Adoption Checklist | https://mglearn.github.io/tcea/ai-adoption-checklist/ |
| AI Essentials Prompt Library | https://mglearn.github.io/tcea/ai-essentials-prompt-library/ |
| AI Custom Instructions Library | https://mglearn.github.io/tcea/custom-instructions-library/ |
| Augmented K–16 AI Learning Framework | https://mglearn.github.io/tcea/alf/ |
| PROTECT Rubric v2.0 | https://mglearn.github.io/tcea/protect_rubric_v2/ |
| Digital Accessibility Readiness Assessment | https://mglearn.github.io/tcea/a11y/ |
| High-Effect Strategy Coach | https://mglearn.github.io/tcea/coach-tool/ |
| Flip the Script: Better Campus Meetings | https://mglearn.github.io/tcea/cesm/ |
| Data Display Patterns field guide | https://mglearn.github.io/tcea/ddp/ |
| Learning Activities Hub | https://mglearn.github.io/activities/ |
| Digital Inquiry Group: Civic Online Reasoning (lateral reading lessons) | https://cor.inquirygroup.org/ |
| News Literacy Project | https://newslit.org/ |
| Texas HB 1481 (2025), enrolled bill text: personal communication devices | https://capitol.texas.gov/tlodocs/89R/billtext/html/HB01481F.htm |
| AAP policy statement: Digital Ecosystems, Children, and Adolescents (Pediatrics, 2026) | https://publications.aap.org/pediatrics/article/157/2/e2025075320/206129/Digital-Ecosystems-Children-and-Adolescents-Policy |
| AAP Family Media Plan (HealthyChildren.org) | https://www.healthychildren.org/English/fmp/Pages/MediaPlan.aspx |
| The Common Sense Census: Media Use by Tweens and Teens, 2021 (report PDF) | https://www.commonsensemedia.org/sites/default/files/research/report/8-18-census-integrated-report-final-web_0.pdf |
| Tomorrow's Front Page, by Tricia Friedman (inspiration for the futures-headline activities; credit it, never copy it) | https://triciafriedman.com/tomorrows-front-page/ |
