# Daily Opener a Day: calendar content

A school-year flip calendar of 5-minute openers for students, one Student ELE per
week. Files: `data/calendar/weeks-<first>-<last>.json` = `{ "weeks": [ … ] }`.
Validate with `node scripts/validate.js`.

## Week plan (fixed: write exactly these)

| Week | Starts (2026–27) | ELE focus | Note |
|---:|---|---|---|
| 1 | Aug 17 | S4.1 | first week: owning your learning |
| 2 | Aug 24 | S3.1 | working as a team |
| 3 | Aug 31 | S1.1 | tech that supports learning |
| 4 | Sep 7 | S1.2 | adapting to new tools (Mon is Labor Day) |
| 5 | Sep 14 | S3.2 | communicating ideas clearly |
| 6 | Sep 21 | S2.1 | protecting personal information |
| 7 | Sep 28 | S2.3 | risks of sharing |
| 8 | Oct 5 | S1.3 | how AI can help me learn |
| 9 | Oct 12 | AI1.1 | how AI works |
| 10 | Oct 19 | S2.2 | trustworthy sources (around Digital Citizenship Week) |
| 11 | Oct 26 | S3.3 | diverse perspectives |
| 12 | Nov 2 | AI1.3 | AI limits and bias |
| 13 | Nov 9 | S4.2 | goals and progress |
| 14 | Nov 16 | S5.1 | solving problems step by step |
| 15 | Nov 30 | S5.2 | creativity and logic |
| 16 | Dec 7 | S5.3 | computational thinking (around Computer Science Education Week) |
| 17 | Dec 14 | S4.3 | strengths and growth before the break |
| 18 | Jan 4 | S4.2 | new-year learning goals |
| 19 | Jan 11 | AI2.1 | using AI ethically |
| 20 | Jan 18 | S3.2 | kind, clear communication online (Mon is MLK Day) |
| 21 | Jan 25 | S2.1 | privacy check-up |
| 22 | Feb 1 | S2.2 | news literacy (around National News Literacy Week) |
| 23 | Feb 8 | AI4.1 | questioning AI answers |
| 24 | Feb 15 | S3.3 | perspectives (Mon is Presidents Day) |
| 25 | Feb 22 | S1.3 | AI as a study partner, not a shortcut |
| 26 | Mar 1 | S5.1 | problem solving |
| 27 | Mar 8 | AI5.1 | humans and AI working together |
| 28 | Mar 22 | S2.3 | digital footprint (Fri is Good Friday) |
| 29 | Mar 29 | S1.1 | choosing the right tool |
| 30 | Apr 5 | S3.1 | teamwork |
| 31 | Apr 12 | AI5.3 | AI and human creativity |
| 32 | Apr 19 | S5.2 | innovative ideas |
| 33 | Apr 26 | S1.2 | learning a new tool |
| 34 | May 3 | S4.3 | calm, confident learners (testing season) |
| 35 | May 10 | S5.3 | computational thinking |
| 36 | May 17 | S3.2 | sharing what we learned |
| 37 | May 24 | S4.1 | looking back: owning my learning |

Keep references to observances general ("this week many schools celebrate…"),
without claiming exact dates.

## Week object

```jsonc
{
  "week": 1,
  "ele": "S4.1",                        // from the plan
  "title": "I Own My Learning",         // 2–5 words, student-friendly
  "bigIdea": "One sentence for the teacher: what this week builds and why.",
  "days": [                             // exactly 5, in this order of "kind"
    {
      "kind": "warm-up",                // Mon warm-up | Tue think-it | Wed check-it | Thu team-up | Fri i-can
      "format": "vote",                 // quick-write | turn-and-talk | vote | fact-or-fake | sort | would-you-rather | image-talk | stand-up-sit-down | draw
      "strand": "digcit",               // genai | digcit | medialit (vary across the week)
      "title": "3–6 words",
      "k5": "Prompt for grades K–5, read aloud or projected: 1–2 short sentences.",
      "g612": "Prompt for grades 6–12: 1–3 sentences, more nuance.",
      "options": ["optional", "choices"],   // optional; shared by both levels if given (2–5)
      "answer": "Optional reasoning to share after; REQUIRED for fact-or-fake (cover both levels if they differ).",
      "teacher": "One sentence: how students respond and the one follow-up question.",
      "related": "optional id of an existing opener (data/openers) or activity (data/activities)",
      "scene": "REQUIRED photo direction, 2–4 sentences, for a striking photorealistic image that DRAMATIZES this opener (see Scene rules)",
      "alt": "REQUIRED one-sentence alt text for that image"
    }
  ]
}
```

## Day types
- **Mon warm-up:** a quick vote, would-you-rather, or stand-up/sit-down connected to the week's ELE.
- **Tue think-it:** a quick-write or draw; students connect the idea to their own life.
- **Wed check-it:** verification or media literacy: fact-or-fake, a described image, a source check, or spotting an AI mistake (always with an `answer`).
- **Thu team-up:** turn-and-talk or a quick sort that needs a partner or group.
- **Fri i-can:** students rate themselves 1–4 fingers on the week's ELE "I can / I know / I am aware" statement (paraphrase it for kids) and name one next step.

## Scene rules (each day gets its own image, file `cal-wNN-dD.jpg`)
- Dramatize the opener's situation, not a generic classroom: the moment, the object, or the dilemma the prompt is about. Examples: a phone lighting up on a dark bus seat with a too-good-to-be-true message; two hands hovering over "share" on a blurred screen; a kid whispering to a smart speaker on a kitchen counter; a detective-style close-up of a magnifying glass over a printed photo; a teen at a crossroads of two hallways.
- Cinematic and striking: bold composition, dramatic but natural light (window beams, desk-lamp glow, golden hour), shallow depth of field, close-ups and unusual angles. It must still be photorealistic documentary style, not illustration or sci-fi.
- Follow the photo brief's hard rules: fictional people only; **no readable text** on screens, paper, or signs (show blur, shapes, or glow); no logos or brands; no robots, glowing brains, or holograms; minors in ordinary settings, never in distress; natural diversity across the year (strong Latino representation, plus Black, white, Asian American, MENA, Native American, and multiracial people; disabilities and visible identities appear naturally).
- About half the images should show people and half should be object or place close-ups, so the calendar feels varied.
- Say the ages when people appear. The scene should fit both K–5 and 6–12 versions of the opener, or lean toward the more universal moment.

## Rules
- Students decide, explain, verify, create, or reflect every day.
- No handouts, no devices required (teacher may project). Under-13: teacher drives any AI demo.
- K–5 prompts: simple words, a teacher can read aloud. 6–12 prompts: real teen contexts.
- Fictional names, places, brands; no invented statistics presented as fact; no real people or companies.
- Across each file, use all three strands and vary formats; don't repeat a prompt idea from another week.
