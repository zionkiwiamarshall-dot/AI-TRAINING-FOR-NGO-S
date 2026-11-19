# AI at Work for NGO Teams

Website for a hands-on AI training camp for NGO and SACCO teams in Tanzania and East Africa.

- `index.html`: the landing page (programme, stories, sector tracks, pilot process, FAQ, pilot request).
- `course/index.html`: the interactive learner's guide (lessons, illustrated worked examples, 14 quizzes with an answer sheet, games, templates, worksheets).
- `assets/scenes.js`: the illustration code shared by both pages (staff characters, office scenes, three-panel stories).

Plain HTML, CSS and JavaScript. No build step. Hosted with GitHub Pages from the `main` branch root.

## Editing

- **Contact details:** in `index.html`, find `var SITE=` and set `email` and, optionally, `whatsapp` (digits with country code). The pilot form opens WhatsApp if a number is set, otherwise the visitor's email app.
- **Brand colours:** the four `--brand` tokens at the top of each page's `<style>`. Change them for a location-neutral edition.
- **Quiz questions, sectors and stories:** data arrays in the `<script>` of `course/index.html` (`Q`, `SECT`, `FN`, `TPL`) and `STRIPS` in `assets/scenes.js`.

## Content notes

Personas and stories are fictional. AI outputs in the examples are illustrative, not recorded sessions. The sample results report on the landing page uses illustrative figures. Statistics are sourced in the footer and in the guide's Sources section.
