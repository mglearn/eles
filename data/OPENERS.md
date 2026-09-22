# Daily Openers schema

Short bellringer activities for students (5–10 minutes), each built around the
**Student ELEs** (S1 Tech Savvy, S2 Online Safety, S3 Collaborative Learner, S4
Self-Directed Learner, S5 Creative Problem Solver), with AI ELEs where genuine.
One file per grade band: `data/openers/<band>.json` = `{ "openers": [ … ] }`
where band is `k2`, `35`, `68`, `912`. Validate with `node scripts/validate.js`.

```jsonc
{
  "id": "k2-robot-or-person",          // band prefix + kebab-case, unique across all files
  "title": "Robot or Person?",          // 2–6 words, kid-friendly
  "grades": ["K-2"],                    // the file's band (may add one neighbor band)
  "strands": ["genai"],                 // 1–2 of genai | digcit | medialit
  "eles": ["S1.3", "AI1.1"],            // 1–3 ids; the FIRST must be a Student (S*) indicator
  "format": "vote",                     // quick-write | turn-and-talk | vote | fact-or-fake | sort | would-you-rather | image-talk | stand-up-sit-down | draw
  "mode": "unplugged",                  // unplugged | digital | hybrid (most should be unplugged)
  "minutes": 5,                         // 5, 7, or 10
  "prompt": "What students see or hear, projected or read aloud: 1–3 short sentences. May include a short fictional post or message in quotes.",
  "options": ["Robot", "Person", "Not sure yet"],   // optional: choices for vote / sort / would-you-rather / fact-or-fake (2–6)
  "teacher": "How to run it in 1–2 sentences: the routine, how students respond (thumbs, fingers, corners, whiteboards, partner talk), and the one question to ask after.",
  "answer": "Optional: the reasoning or answer to share after (1–2 sentences). Required for fact-or-fake.",
  "lookFor": "One observable sign it worked (what students say, show, or write).",
  "next": "One sentence connecting to the next step or to home.",
  "related": "activity-id"               // optional: an existing activity in data/activities it previews
}
```

## Rules
- **Students are the owners.** Every opener asks students to decide, explain, verify, create, or reflect, never just to listen.
- **Quick and low-prep.** No handouts required; at most paper, sticky notes, or whiteboards. Projector optional. The prompt must work read aloud.
- **Grade-appropriate language.** K–2 prompts are one or two short sentences a teacher reads aloud.
- **Content rules from SCHEMA.md apply:** fictional names, places, and brands; no invented statistics; tool-agnostic; under-13 students never use personal AI accounts (the teacher drives any AI demo).
- **Balance** across a file: all five Student ELE areas (S1–S5) at least twice, all three strands, a mix of formats, and at least 10 of 15 unplugged.
