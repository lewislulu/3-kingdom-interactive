# Storyline Visualization Template

An interactive, cinematic timeline visualization for **any topic** with characters, events, and narrative scenes. Built with Vanilla JS, D3.js, and GSAP.

Dark cinematic theme. Pan/zoom SVG canvas. Character storylines that converge at shared events. Dialogue scenes with typewriter animations. Chapter-based navigation. Biography mode. Minimap. GitHub issue feedback via Vercel Functions.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

## How It Works

The app renders a horizontal timeline where **characters** are represented as colored lines and **events** are gold nodes. Lines curve toward each other when characters share an event. Click an event node to read its narrative. Click a character portrait to see their bio. Enter biography mode to focus on a single character's journey.

All content is data-driven. You supply JSON + Markdown files; the engine renders the visualization.

---

## Project Structure

```
vis-storyline-template/
├── index.html                    # App shell (title, HTML skeleton)
├── package.json
├── vite.config.js
├── vercel.json                   # Vercel deployment + API routing
│
├── api/
│   └── create-issue.js           # Serverless function: GitHub issue proxy
│
├── data/                         # ★ ALL YOUR CONTENT GOES HERE
│   ├── timeline.json             # Master config: eras, chapters, character/event lists
│   ├── characters/
│   │   ├── alice.json            # Character definition
│   │   ├── bob.json
│   │   └── carol.json
│   └── events/
│       ├── founding-event.json   # Event metadata
│       ├── founding-event.md     # Event narrative (Background / Process / Result + Scenes)
│       ├── ...
│
├── src/
│   ├── main.js                   # Boot sequence, wires everything together
│   ├── core/
│   │   ├── timeline.js           # D3 SVG rendering engine (lines, nodes, convergence)
│   │   ├── router.js             # Hash-based URL state (#chapter=ch1&event=...)
│   │   └── minimap.js            # Bottom-left minimap
│   ├── data/
│   │   └── loader.js             # Data loading + Markdown parsing (section names configured here)
│   ├── ui/
│   │   ├── chapter-bar.js        # Top navigation bar
│   │   ├── character-card.js     # Character bio popup
│   │   ├── event-panel.js        # Right-side event detail panel with tabs
│   │   ├── detail-view.js        # Scene overlay with dialogue rendering
│   │   ├── personal-tooltip.js   # Hover tooltip for personal events
│   │   ├── legend.js             # Bottom-right legend
│   │   ├── feedback.js           # Feedback button + modal (GitHub issues)
│   │   └── particles.js          # Background particle animation
│   ├── styles/
│   │   └── main.css              # All styles (dark cinematic theme)
│   └── utils/
│       ├── helpers.js            # clamp, lerp, debounce, portrait placeholder
│       └── animations.js         # GSAP animation presets
│
└── public/
    ├── portraits/                # Character portrait images (optional)
    ├── fonts/                    # Custom fonts (optional)
    └── textures/                 # Background textures (optional)
```

---

## Content Authoring Guide

### 1. Timeline Configuration (`data/timeline.json`)

This is the master file. It defines the time range, historical eras, chapters, and which characters/events belong to each chapter.

```json
{
  "title": "My Topic",
  "timeRange": [1900, 1960],
  "eras": [
    { "name": "Era One", "start": 1900, "end": 1920 },
    { "name": "Era Two", "start": 1920, "end": 1940 }
  ],
  "chapters": [
    {
      "id": "ch1",
      "number": 1,
      "title": "The Beginning",
      "subtitle": "How it all started",
      "timeRange": [1900, 1920],
      "description": "Chapter description...",
      "characters": ["alice", "bob"],
      "events": ["founding-event", "first-milestone"],
      "coverColor": "#d4a853"
    }
  ],
  "characters": ["alice", "bob", "carol"],
  "events": ["founding-event", "first-milestone", "turning-point"]
}
```

| Field | Description |
|-------|-------------|
| `timeRange` | `[startYear, endYear]` for the full visualization |
| `eras` | Background bands with labels on the timeline |
| `chapters` | Filterable sub-views; each chapter shows only its characters and events |
| `characters` | Array of character IDs (must match filenames in `data/characters/`) |
| `events` | Array of event IDs (must match filenames in `data/events/`) |

### 2. Character Files (`data/characters/<id>.json`)

One JSON file per character. The filename (without `.json`) must match the character's `id`.

```json
{
  "id": "alice",
  "name": "Alice",
  "courtesy": "",
  "birth": 1880,
  "death": 1950,
  "color": "#e74c3c",
  "portrait": "portraits/alice.jpg",
  "bio": "A one-paragraph biography...",
  "activeRange": [1900, 1945],
  "tags": ["Leader", "Visionary"],
  "personalEvents": [
    {
      "year": 1908,
      "title": "First Publication",
      "description": "Longer description of this personal event...",
      "type": "milestone"
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `color` | Hex color for the character's line and UI accents |
| `activeRange` | `[startYear, endYear]` -- the line is drawn across this range |
| `personalEvents` | Diamond markers on the character's line. Type: `"milestone"`, `"turning-point"`, or `"anecdote"` |

**Important:** `activeRange` must cover all `personalEvents` years, otherwise they won't be visible.

### 3. Event Files (`data/events/<id>.json` + `<id>.md`)

Each event has a **JSON metadata file** and a **Markdown narrative file** (same filename, different extension).

**JSON** (`founding-event.json`):

```json
{
  "id": "founding-event",
  "name": "The Founding",
  "year": 1905,
  "month": 3,
  "characters": ["alice", "bob"],
  "importance": "major",
  "narrative": "events/founding-event.md",
  "relatedEvents": ["first-milestone"],
  "scenes": [
    { "id": "secret-meeting", "title": "The Secret Meeting", "hasDialogue": true }
  ]
}
```

| Field | Description |
|-------|-------------|
| `importance` | `"major"` (large pulsing node) or `"normal"` (smaller node) |
| `characters` | IDs of characters involved -- they'll show as chips in the panel and their lines will converge at this event |
| `relatedEvents` | Links to other events shown in the panel's "Related Events" section |
| `scenes` | Scene cards shown below the narrative; clicking opens the detail overlay |

**Markdown** (`founding-event.md`):

```markdown
## Background

Context and setup for the event...

## Process

What happened during the event...

## Result

Consequences and aftermath...

---

### Scene: The Secret Meeting

Narrative text describing the scene setting.

> Alice (determined): "We have talked long enough. Tonight we act."

> Bob (cautious): "Are you certain everyone here can be trusted?"
```

**Markdown rules:**
- Sections must be `## Background`, `## Process`, `## Result` (configurable in `loader.js`)
- Scenes start after `---` with `### Scene: Title`
- Dialogue format: `> Speaker (emotion): "Text"` -- emotion is optional
- Non-dialogue lines become narrative paragraphs
- Lines starting with `> ` that don't match dialogue format become blockquotes

### 4. Customizing Section Names

If you want to use different section headers (e.g., for a non-English project), edit `src/data/loader.js`:

```js
const SECTION_MAP = {
  'Background': 'background',   // Change left side to your header text
  'Process': 'process',
  'Result': 'result',
};

export const SECTION_LABELS = {
  background: 'Background',     // Change these to your tab labels
  process: 'Process',
  result: 'Result',
};

const SCENE_PREFIX = 'Scene';    // Change to match your ### headers
```

Also update the tab labels in `index.html`:

```html
<button class="tab active" data-tab="background">Background</button>
<button class="tab" data-tab="process">Process</button>
<button class="tab" data-tab="result">Result</button>
```

---

## Features

### Character Line Convergence

When multiple characters participate in the same event, their lines curve toward a common center point using Bezier curves. This visually represents "fateful meetings" in your storyline.

**Implementation:** `timeline.js` -- `_buildConvergencePoints()` finds multi-character events, `_buildCharacterPath()` generates SVG path with cubic Bezier curves, `_renderConvergenceGlows()` adds soft glow at intersection points.

### Chapter Navigation

The top bar shows chapter cards. Clicking a chapter filters the view to show only that chapter's characters, events, and time range. The timeline animates smoothly between views.

**Implementation:** `chapter-bar.js` renders the navigation. `timeline.js` `setChapter()` updates `activeCharacters`, `activeEvents`, `activeTimeRange`, rebuilds scales, and re-renders.

### Biography Mode

Click a character portrait, then "Biography" to enter single-character focus mode. The timeline zooms to show only that character's line with all their personal events labeled.

**Implementation:** `timeline.js` `setBiographyMode()` sets `activeCharacters` to a single character and expands the time range to cover all personal events.

### Event Narrative Panel

Click an event node to open the right-side panel. Three tabs (Background / Process / Result) show parsed markdown content. Scene cards below link to the detail overlay.

**Implementation:** `event-panel.js` receives parsed narrative data from `loader.js`. `loader.js` `parseNarrative()` splits markdown into sections and scenes.

### Scene Dialogue Overlay

Click a scene card to open a full-screen overlay with dialogue rendered as chat bubbles. Character avatars are shown next to their lines. Narrative text appears between dialogues.

**Implementation:** `detail-view.js` renders `elements[]` array from parsed scene data. Each element is typed as `dialogue`, `narrative`, or `quote`.

### Personal Events

Diamond-shaped markers on character lines show personal milestones, turning points, and anecdotes. Hover to see a tooltip with details.

**Implementation:** `timeline.js` `_renderPersonalEvents()` reads `personalEvents[]` from character data. `personal-tooltip.js` shows the tooltip. Types (`milestone`, `turning-point`, `anecdote`) get different colored badges.

### Lead-in Lines

Each chapter starts with a short parallel segment before any convergence bending, preventing lines from bunching at the edges.

**Implementation:** `timeline.js` `_getEffectiveLineStart()` extends line starts backward when the first convergence event is too close to the chapter boundary.

### Minimap

A small canvas in the bottom-left shows the full timeline with a viewport rectangle indicating the current zoom area.

**Implementation:** `minimap.js` draws character lines and event nodes on a canvas, scales them to the minimap size, and updates the viewport rectangle on zoom changes.

### Feedback / GitHub Issues

A floating button in the bottom-right opens a form that submits GitHub issues via a Vercel serverless function. The token stays server-side.

**Implementation:** `feedback.js` (frontend modal) -> `api/create-issue.js` (serverless proxy) -> GitHub API.

### URL State

The URL hash tracks current chapter, event, and biography state. Supports browser back/forward and direct linking.

**Implementation:** `router.js` parses and updates `location.hash` with `chapter=`, `event=`, `bio=` parameters.

---

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Set environment variables:

| Variable | Value |
|----------|-------|
| `GITHUB_TOKEN` | Personal Access Token with `repo` scope |
| `GITHUB_OWNER` | Your GitHub username |
| `GITHUB_REPO` | Repository name |

The `vercel.json` is already configured for Vite + API routes.

---

## Customization Checklist

When starting a new project from this template:

- [ ] Edit `index.html` -- change `<title>`, `<h1>`, `<p class="subtitle">`
- [ ] Edit `data/timeline.json` -- define your eras, chapters, characters, events
- [ ] Create character JSON files in `data/characters/`
- [ ] Create event JSON + MD files in `data/events/`
- [ ] Optionally add portrait images to `public/portraits/`
- [ ] Optionally edit section names in `src/data/loader.js` and `index.html` tabs
- [ ] Optionally change the font in `index.html` and `main.css` (`--font-serif`)
- [ ] Optionally edit color palette in `main.css` `:root` variables

---

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| [D3.js](https://d3js.org/) | 7.x | SVG rendering, scales, zoom |
| [GSAP](https://gsap.com/) | 3.x | Animations (panel slides, fades, stagger reveals) |
| [marked](https://marked.js.org/) | 17.x | Markdown to HTML |
| [Vite](https://vite.dev/) | 7.x | Dev server, build tool, asset loading (`import.meta.glob`) |

No framework. No React/Vue/Svelte. Pure DOM manipulation + D3 for SVG.

## License

MIT
