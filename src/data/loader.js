/**
 * Data Loader -- loads character and event data from JSON + Markdown files
 *
 * Markdown narrative format:
 *   ## Background       (or your custom section name -- update SECTION_MAP below)
 *   ## Process
 *   ## Result
 *   ---
 *   ### Scene: Title
 *   > Speaker (emotion): "Dialogue text"
 */

// ── Section name mapping ──────────────────────────────────
// Change these to match the section headers used in your .md files.
// Keys are what appears in the markdown; values are internal IDs.
const SECTION_MAP = {
  '事件背景': 'background',
  '事件经过': 'process',
  '事件结果': 'result',
};

// Tab labels displayed in the UI (same order as above)
export const SECTION_LABELS = {
  background: '事件背景',
  process: '事件经过',
  result: '事件结果',
};

// Scene header prefix used in markdown (e.g. "### 场景：Title")
const SCENE_PREFIX = '场景';

// ── Data imports (Vite eager glob) ────────────────────────
const characterModules = import.meta.glob('/data/characters/*.json', { eager: true });
const eventModules = import.meta.glob('/data/events/*.json', { eager: true });
const eventMarkdown = import.meta.glob('/data/events/*.md', { eager: true, query: '?raw', import: 'default' });

/**
 * Load the master timeline configuration
 */
export async function loadTimeline() {
  const res = await fetch('/data/timeline.json');
  return res.json();
}

/**
 * Load all character data
 */
export function loadCharacters() {
  const characters = {};
  for (const [path, mod] of Object.entries(characterModules)) {
    const data = mod.default || mod;
    characters[data.id] = data;
  }
  return characters;
}

/**
 * Load all event data with their markdown narratives
 */
export function loadEvents() {
  const events = {};
  for (const [path, mod] of Object.entries(eventModules)) {
    const data = mod.default || mod;
    events[data.id] = { ...data };
  }

  // Attach markdown content to events
  for (const [path, content] of Object.entries(eventMarkdown)) {
    const filename = path.split('/').pop().replace('.md', '');
    if (events[filename]) {
      events[filename].markdownContent = content;
    }
  }

  return events;
}

/**
 * Parse markdown content into sections and scenes
 */
export function parseNarrative(markdownContent) {
  if (!markdownContent) return { sections: {}, scenes: [] };

  const parts = markdownContent.split('---');
  const mainContent = parts[0] || '';
  const scenesRaw = parts.slice(1).join('---');

  // Build regex from SECTION_MAP keys
  const sectionNames = Object.keys(SECTION_MAP).join('|');
  const sectionRegex = new RegExp(`## (${sectionNames})\\n([\\s\\S]*?)(?=## |$)`, 'g');

  const sections = {};
  let match;
  while ((match = sectionRegex.exec(mainContent)) !== null) {
    const name = match[1];
    const content = match[2].trim();
    const key = SECTION_MAP[name];
    if (key) sections[key] = content;
  }

  // Parse scenes
  const scenes = [];
  const sceneRegex = new RegExp(`### ${SCENE_PREFIX}[：:]\\s*(.+?)\\n([\\s\\S]*?)(?=### ${SCENE_PREFIX}[：:]|$)`, 'g');
  while ((match = sceneRegex.exec(scenesRaw || mainContent)) !== null) {
    const title = match[1].trim();
    const body = match[2].trim();

    const lines = body.split('\n');
    const elements = [];
    let narrativeBuffer = '';

    for (const line of lines) {
      const dialogueMatch = line.match(/^>\s*(.+?)(?:（(.+?)）|\((.+?)\))?[：:]\s*"(.+?)"$/);
      if (dialogueMatch) {
        if (narrativeBuffer.trim()) {
          elements.push({ type: 'narrative', text: narrativeBuffer.trim() });
          narrativeBuffer = '';
        }
        elements.push({
          type: 'dialogue',
          speaker: dialogueMatch[1],
          emotion: dialogueMatch[2] || dialogueMatch[3] || null,
          text: dialogueMatch[4],
        });
      } else if (line.startsWith('> ')) {
        if (narrativeBuffer.trim()) {
          elements.push({ type: 'narrative', text: narrativeBuffer.trim() });
          narrativeBuffer = '';
        }
        const simpleDialogue = line.replace(/^>\s*/, '').match(/^(.+?)(?:（(.+?)）|\((.+?)\))?[：:]\s*"?(.+?)"?$/);
        if (simpleDialogue) {
          elements.push({
            type: 'dialogue',
            speaker: simpleDialogue[1],
            emotion: simpleDialogue[2] || simpleDialogue[3] || null,
            text: simpleDialogue[4].replace(/^"|"$/g, ''),
          });
        } else {
          elements.push({ type: 'quote', text: line.replace(/^>\s*/, '') });
        }
      } else {
        narrativeBuffer += line + '\n';
      }
    }
    if (narrativeBuffer.trim()) {
      elements.push({ type: 'narrative', text: narrativeBuffer.trim() });
    }

    scenes.push({ title, elements });
  }

  return { sections, scenes };
}

/**
 * Load everything and return a unified data store
 */
export async function loadAllData() {
  const [timeline] = await Promise.all([loadTimeline()]);
  const characters = loadCharacters();
  const events = loadEvents();

  for (const event of Object.values(events)) {
    if (event.markdownContent) {
      const parsed = parseNarrative(event.markdownContent);
      event.narrative_parsed = parsed;
    }
  }

  return { timeline, characters, events };
}
