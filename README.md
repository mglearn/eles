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

## Daily openers

`data/openers/<band>.json` (k2, 35, 68, 912) holds 5–10 minute bellringers built
around the Student ELEs; see `data/OPENERS.md` for the format. They render on
`openers.html` (filters, text search, a full-screen **Project** view with arrow-key
navigation, and a print layout) and join the home catalog search: they appear in
results when someone searches or picks the "Daily openers" type. `validate.js` checks
them; translations use units `openers-<band>`.

## Languages

English is the source, at the site root. Spanish (`/es/`) and Vietnamese (`/vi/`) are
full mirrors built from flat overlays in `data/i18n/<lang>/` (`ui.json`, `eles.json`,
`standards.json`, `activities/<id>.json`); a missing string falls back to English.
Translations are AI-assisted and labeled for native-speaker review on every page.
Picker languages follow Contraband (en, es, vi, ar, hi, ur, zh); a language appears
once `data/i18n/<lang>/ui.json` exists.

To update translations after editing English content:

```bash
node scripts/i18n.js extract es          # writes .drafts/es/<unit>.en.txt for missing strings
#   translate each into .drafts/es/<unit>.es.txt, same `path|text` lines
node scripts/i18n.js check es <unit>     # validates lines, ** markers, {placeholders}, ELE ids
python3 scripts/i18n_fixes.py es         # cross-reference titles + recorded hand corrections
node scripts/i18n.js assemble es         # writes data/i18n/es/…
node scripts/i18n.js status              # coverage per language
node scripts/build.js
```

Record any hand correction to a translation in `scripts/i18n_fixes.py`, not in
`data/i18n/`, or the next `assemble` will overwrite it.

## Standards

`data/standards.json` maps each activity to TEKS, ELPS, UDL 3.0, and SST codes from
`data/standards-catalog.json`; `standards.html` and each activity page render it.
Standards are paraphrased and cited by section number, never quoted.

## Photos

Generated photos arrive in `~/Desktop/eleimages/images/` with `credits.json` (brief:
`~/Desktop/eleimages/IMAGE_PROMPTS.md`). `python3 scripts/import_images.py` makes web and
thumbnail sizes in `assets/img/` and records alt text in `data/images.json`.

## Filtering links

The catalog keeps filters in the URL, so any view can be shared, e.g.
`index.html?strand=genai&grade=K-2`, `?audience=pl&role=coaches`, `?mode=unplugged`,
or `?area=T2.0` for one ELE area.

## Licensing

Activities: CC BY-SA 4.0, by Miguel Guhlin. Framework text: TCEA Essential Learning
Expectations, CC BY-SA 2024 (https://tinyurl.com/tceaeles1).
