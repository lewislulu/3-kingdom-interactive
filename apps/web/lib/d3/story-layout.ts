import type { Character, StoryEvent } from "@sgyy/schema";

export type CharacterPath = {
  characterId: string;
  d: string;
};

export type EventNode = StoryEvent & {
  x: number;
  y: number;
  orderIndex: number;
  participantYs: number[];
};

export type ChapterMarker = {
  chapter: number;
  x: number;
};

export type StoryGeometry = {
  width: number;
  height: number;
  rowHeight: number;
  colWidth: number;
  offsetX: number;
  lineStartX: number;
  paths: CharacterPath[];
  nodes: EventNode[];
  chapterMarkers: ChapterMarker[];
  laneYs: number[];
};

export function getRowHeight(zoom: number): number {
  return Math.max(62, Math.round(86 * zoom));
}

export function getColWidth(zoom: number): number {
  return Math.max(76, Math.round(98 * zoom));
}

export function buildStoryGeometry(
  characters: Character[],
  events: StoryEvent[],
  zoom: number
): StoryGeometry {
  const rowHeight = getRowHeight(zoom);
  const colWidth = getColWidth(zoom);
  const lineStartX = Math.max(68, Math.round(80 * zoom));
  const offsetX = Math.max(120, Math.round(150 * zoom));
  const paddingRight = Math.max(170, Math.round(220 * zoom));
  const eventGap = Math.max(128, Math.round(colWidth * 1.5));
  const chapterGap = Math.max(168, Math.round(colWidth * 1.8));

  const sortedEvents = [...events].sort((a, b) => a.chapter - b.chapter || a.seq_in_chapter - b.seq_in_chapter);
  const eventsByChapter = new Map<number, StoryEvent[]>();
  for (const event of sortedEvents) {
    const chapterEvents = eventsByChapter.get(event.chapter) ?? [];
    chapterEvents.push(event);
    eventsByChapter.set(event.chapter, chapterEvents);
  }

  const chapterOrder = [...eventsByChapter.keys()].sort((a, b) => a - b);
  const eventXById = new Map<string, number>();
  const chapterFirstPos = new Map<number, number>();
  let cursorX = offsetX;

  for (const chapter of chapterOrder) {
    const chapterEvents = (eventsByChapter.get(chapter) ?? []).sort((a, b) => a.seq_in_chapter - b.seq_in_chapter);
    cursorX += chapterGap;
    chapterFirstPos.set(chapter, cursorX);
    chapterEvents.forEach((event, index) => {
      const eventX = cursorX + index * eventGap;
      eventXById.set(event.id, eventX);
    });
    cursorX += Math.max(0, (chapterEvents.length - 1) * eventGap);
  }

  const width = Math.max(offsetX + paddingRight + 220, cursorX + paddingRight);
  const height = Math.max(320, characters.length * rowHeight);

  const characterIndex = new Map(characters.map((character, idx) => [character.id, idx]));
  const laneYs = characters.map((_, idx) => idx * rowHeight + rowHeight / 2);
  const getLaneY = (characterId: string): number | null => {
    const idx = characterIndex.get(characterId);
    if (typeof idx !== "number") return null;
    return laneYs[idx] ?? null;
  };

  const pathStateByCharacter = new Map<
    string,
    {
      d: string;
      currentX: number;
      currentY: number;
      baseY: number;
    }
  >();
  for (const character of characters) {
    const baseY = getLaneY(character.id);
    if (typeof baseY !== "number") continue;
    pathStateByCharacter.set(character.id, {
      d: `M ${lineStartX} ${baseY} `,
      currentX: lineStartX,
      currentY: baseY,
      baseY
    });
  }

  const nodes: EventNode[] = [];

  sortedEvents.forEach((event, index) => {
    const position = index + 1;
    const eventX = eventXById.get(event.id);
    if (typeof eventX !== "number") return;

    const involvedIndices = event.character_ids
      .map((id) => characterIndex.get(id))
      .filter((value): value is number => typeof value === "number" && value >= 0)
      .sort((a, b) => a - b);

    if (!involvedIndices.length) return;

    const involvedBaseYs = involvedIndices
      .map((indexValue) => laneYs[indexValue])
      .filter((value): value is number => typeof value === "number");

    if (!involvedBaseYs.length) return;

    const centerY = involvedBaseYs.reduce((sum, value) => sum + value, 0) / involvedBaseYs.length;
    const mergeSpacing = Math.max(10, 14 * zoom);
    const participantYByCharacterId = new Map<string, number>();
    involvedIndices.forEach((idxInCharacters, idxInEvent) => {
      const characterId = characters[idxInCharacters]?.id;
      if (!characterId) return;
      const offset = (idxInEvent - (involvedIndices.length - 1) / 2) * mergeSpacing;
      participantYByCharacterId.set(characterId, centerY + offset);
    });

    nodes.push({
      ...event,
      x: eventX,
      y: centerY,
      orderIndex: position,
      participantYs: [...participantYByCharacterId.values()]
    });

    for (const character of characters) {
      const pathState = pathStateByCharacter.get(character.id);
      if (!pathState) continue;

      const targetY = participantYByCharacterId.get(character.id) ?? pathState.baseY;
      const controlX1 = pathState.currentX + (eventX - pathState.currentX) / 2;
      const controlX2 = eventX - (eventX - pathState.currentX) / 2;

      pathState.d += `C ${controlX1} ${pathState.currentY}, ${controlX2} ${targetY}, ${eventX} ${targetY} `;
      pathState.currentX = eventX;
      pathState.currentY = targetY;
    }
  });

  const endX = width - 24;

  const paths: CharacterPath[] = [];
  for (const [characterId, state] of pathStateByCharacter.entries()) {
    const controlX = state.currentX + (endX - state.currentX) / 2;
    state.d += `C ${controlX} ${state.currentY}, ${controlX} ${state.baseY}, ${endX} ${state.baseY}`;
    paths.push({ characterId, d: state.d });
  }

  const uniqueChapters = [...chapterFirstPos.entries()].sort((a, b) => a[0] - b[0]);
  const labelStep = uniqueChapters.length <= 14 ? 1 : Math.ceil(uniqueChapters.length / 14);
  const chapterMarkers = uniqueChapters
    .filter((_, idx) => idx % labelStep === 0)
    .map(([chapter, x]) => ({ chapter, x }));

  return { width, height, rowHeight, colWidth, offsetX, lineStartX, paths, nodes, chapterMarkers, laneYs };
}
