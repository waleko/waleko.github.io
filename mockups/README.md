# Redesign mockups

This folder is a sandbox of **11 standalone redesign mockups** for
[alexkovrigin.me](https://alexkovrigin.me), built so Alexander can browse and pick a direction.
Nothing here is wired into the deployed site — `_config.yml`, `_layouts/default.html`,
`style.scss`, and the `_posts/` that drive the live Jekyll build are all untouched.

Open **[`index.html`](index.html)** for the gallery with thumbnails and one-line descriptions
of each variant. Every mockup reuses the real content already in this repo (bio, publications,
author lists, links) — nothing about Alexander is invented.

## Primary inspiration

[Sarthak Mangla's refreshed personal site](https://x.com/msarthak29/status/2122150994897518721) —
a narrow (~640px) centered column on a warm cream background (`#FAF9F6`-ish), a tiny lowercase
sans nav (`home blog photos`), a large serif name heading, three short bio paragraphs with
inline underlined links, a lowercase underlined-link footer, and — the "fun part" — a wide
panoramic painted hero (oil-brushstroke ocean waves on rocks) that **animates on hover** while
staying painterly, most likely a WebGL/canvas shader. That interaction model (static painterly
image → something flows/reacts on hover) is the thread running through most of the hover-reactive
heroes in this folder, even though each one uses different subject matter (Alpine lake, Munich
skyline, shader aurora, particle flow field, neural graph, ink ensō) rather than copying the ocean
scene directly.

## Other reference sites (real, verified)

A short list of other personal/portfolio sites with an overlapping vibe — minimal researcher or
engineer sites, warm paper palettes, painterly or generative interactive art, handwritten touches,
or shader-on-hover effects — with one line each on what's worth borrowing.

| Site | What's worth borrowing |
|---|---|
| [ciechanow.ski](https://ciechanow.ski/) — Bartosz Ciechanowski | Illustrated essays where every diagram is a manipulable 3D/2D model (drag the Moon, steer a bicycle) — the gold standard for "the interactive piece explains something real" rather than being decorative. |
| [jonbarron.info](https://jonbarron.info/) — Jon Barron | This is literally the current site's layout ancestor (credited in `_layouts/default.html`): two-column academic intro, 160×160 hover-video project thumbnails, blue/orange link colors. Good baseline for "minimal academic, but with one small hover surprise per project." |
| [thesephist.com](https://thesephist.com/) — Linus Lee | Independent-researcher voice: plain-spoken bio, a `/projects` page full of small generative-art/canvas side-projects (`Matisse`, `burds!`, a Mondrian generator) treated as legitimate portfolio items, not just a blog. |
| [antfu.me](https://antfu.me/) — Anthony Fu | Extremely minimal dev-portfolio prose (two short paragraphs, plain links), with a separate `100.antfu.me` just for generative-art/interaction experiments — a clean model for keeping the "fun" stuff separate from the CV content. |
| [rauno.me](https://rauno.me/) — Rauno Freiberg | Restrained, almost text-only personal site from someone who writes the book on interaction-design detail (see his [Web Interface Guidelines](https://interfaces.rauno.me/)) — good reference for keeping motion purposeful, fast (<200ms), and never gratuitous. |
| [robinsloan.com](https://www.robinsloan.com/) — Robin Sloan | A quiet, typography-led personal site with a public [colophon](https://www.robinsloan.com/colophon/) explaining every font choice and why — worth copying the idea of being opinionated and explicit about type pairing, which matters a lot once a custom handwriting font is in play. |
| [varun.ca](https://varun.ca/) — Varun Vachhar | A working engineer's portfolio that foregrounds a personal generative-art practice (canvas/SVG/WebGL/shaders, 23 browser-based pieces) right next to the day job — a template for treating a hover-shader hero as a genuine creative piece, not just chrome. |
| [tylerxhobbs.com](https://www.tylerxhobbs.com/) — Tyler Hobbs | Algorithmic, paint-like generative art ("merge the hand with the algorithm") — the clearest real-world precedent for a *painterly, brushstroke-like* canvas/shader hero like the ones in `v1`, `v3`, and `v6` here. |
| [bruno-simon.com](https://bruno-simon.com/) — Bruno Simon | The far end of "fun interactive hero" — a fully drivable 3D Three.js/WebGPU world as a portfolio. Useful as a sense of scale: everything in this folder is deliberately much lighter-weight than this, by design. |
| [distill.pub](https://distill.pub/2020/communicating-with-interactive-articles/) (archived) | ML-research publishing where every figure is interactive/explorable rather than a static plot — relevant given Alexander's own research output; a possible future direction for a `/research` page beyond these homepage mockups. |

## Handwriting font

`assets/fonts/handwriting.otf` / `.woff2` is Alexander's own handwriting, converted from the
uploaded `handwriting.otf` (family **"My Hand"**, Regular) to WOFF2 with `fonttools` for faster
loading, and embedded via `@font-face`. It's used deliberately **unevenly** across the mockups so
it's easy to compare with and without it:

- **Heavy use:** `v4-handwritten-margins` (nav, headline tag, margin notes, section label, footer
  signature) — the most playful option.
- **Light accent only:** `v1-journal-cream` (small "munich" tag next to the name),
  `v9-sidebar-resume` (small "munich, germany" caption), `v11-washi-ma` (the "AK" seal/stamp).
- **Not used at all:** `v2`, `v3`, `v5`, `v6`, `v7`, `v8`, `v10` — these lean on system/serif/mono
  fonts only, for comparison.

## The 11 variants at a glance

1. **`v1-journal-cream`** — faithful-to-inspo cream journal; generative painterly Alpine-lake hero
   that ripples on hover (canvas 2D, no external images).
2. **`v2-shader-waves-dark`** — dark mode; a live WebGL fragment-shader aurora/current that blooms
   toward the cursor.
3. **`v3-ink-brush-munich`** — ink line-study of the Munich skyline (Frauenkirche towers) that
   draws itself in on hover via SVG `stroke-dashoffset`.
4. **`v4-handwritten-margins`** — the playful/hand-drawn option; notebook-ruled paper, heavy use
   of the handwriting font, margin annotations, a doodled mountain that hatches in on hover.
5. **`v5-typographic-academic`** — no hero image at all; a dense CV/journal-style grid with a
   publications table and monospace metadata.
6. **`v6-alpine-parallax`** — flat-illustrated alpenglow mountains in parallax layers; sky shifts
   day → dusk and the sun moves as the cursor moves.
7. **`v7-flow-field-optimizer`** — a tiny "optimization landscape": ~900 particles in a curl-noise
   field converge on wherever the cursor is placed — a nod to his RL/optimization research.
8. **`v8-node-graph-dark`** — dark, monospace/terminal-flavored; a drifting neural-graph canvas
   that lights up and clusters around the cursor like an attention map.
9. **`v9-sidebar-resume`** — two-column sticky-sidebar resume layout with a softly duotone photo.
10. **`v10-terminal-mono`** — a phosphor-green terminal window; bio and publications rendered as
    shell output / `ls -la`, with an ASCII-art Munich skyline that types itself in on hover.
11. **`v11-washi-ma`** — the quietest option: almost all negative space, centered serif type, and
    a single ink ensō circle that draws itself on hover.

## Screenshots

Desktop (and mobile, for a representative few) screenshots of every variant live in
[`screenshots/`](screenshots/) and are also embedded in the pull request description.
