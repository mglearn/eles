# ELE Activity Bank

Professional learning and K–16 student activities built on the **TCEA Essential
Learning Expectations (ELEs)**, weaving in **Generative AI literacy**, **digital
citizenship**, and **media literacy**. Every activity runs on paper (print-ready
handouts) and on screen.

**Live:** https://mglearn.github.io/eles/

The organizing question, from the 2026 ELE update: *What does good learning look
like today?* Technology use by itself is not evidence of learning. So every activity
names its evidence of learning and says whether a screen earns its place.

## Layout

```
data/eles.json            the framework: 5 roles × 5 areas × 3 indicators (75)
data/activities/*.json    one activity per file (author here)
data/SCHEMA.md            activity schema, design principles, content rules, approved links
scripts/validate.js       schema + content checks (run before building)
scripts/build.js          generates the site
assets/                   site.css, app.js (catalog filters), favicon
index.html                GENERATED catalog + ELE coverage matrix
framework.html            GENERATED ELE browser with the activities under each indicator
guide.html                GENERATED facilitator guide
activities/<id>.html      GENERATED facilitator guide per activity
handouts/<id>.html        GENERATED print packet (US Letter) + facilitator key
```

## Adding or editing an activity

1. Write or edit `data/activities/<id>.json` following `data/SCHEMA.md`.
2. `node scripts/validate.js`: must report all files valid.
3. `node scripts/build.js`: regenerates every page and reports ELE coverage.
4. Commit the JSON *and* the generated HTML; GitHub Pages serves the repo root.

No dependencies: plain Node 18+.

## Filtering links

The catalog keeps filters in the URL, so any view can be shared, e.g.
`index.html?strand=genai&grade=K-2`, `?audience=pl&role=coaches`, `?mode=unplugged`,
or `?area=T2.0` for one ELE area.

## Licensing

Activities: CC BY-SA 4.0, by Miguel Guhlin. Framework text: TCEA Essential Learning
Expectations, CC BY-SA 2024 (https://tinyurl.com/tceaeles1).
