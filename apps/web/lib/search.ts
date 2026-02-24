import MiniSearch from "minisearch";
import type { Character, Dialogue, EvidenceRef, StoryEvent } from "@sgyy/schema";

export type SearchDocument = {
  id: string;
  type: "character" | "event" | "quote";
  title: string;
  chapter: number;
  content: string;
  ref_id: string;
};

export function buildSearchIndex(
  characters: Character[],
  events: StoryEvent[],
  dialogues: Dialogue[],
  evidence: EvidenceRef[]
) {
  const evidenceMap = new Map(evidence.map((item) => [item.id, item]));

  const docs: SearchDocument[] = [
    ...characters.map((character) => ({
      id: `character:${character.id}`,
      type: "character" as const,
      title: character.name,
      chapter: character.first_chapter,
      content: [character.name, ...character.aliases, character.title, character.intro, character.camp].join(" "),
      ref_id: character.id
    })),
    ...events.map((event) => ({
      id: `event:${event.id}`,
      type: "event" as const,
      title: event.title,
      chapter: event.chapter,
      content: [event.background, event.process, event.result, ...event.character_ids].join(" "),
      ref_id: event.id
    })),
    ...dialogues.map((dialogue) => {
      const firstEvidence = evidenceMap.get(dialogue.evidence_ref_ids[0]);
      return {
        id: `quote:${dialogue.id}`,
        type: "quote" as const,
        title: dialogue.excerpt,
        chapter: firstEvidence?.chapter ?? 1,
        content: `${dialogue.excerpt} ${dialogue.full_text}`,
        ref_id: dialogue.id
      };
    })
  ];

  const miniSearch = new MiniSearch<SearchDocument>({
    idField: "id",
    fields: ["title", "content"],
    storeFields: ["id", "type", "title", "chapter", "content", "ref_id"],
    searchOptions: {
      boost: { title: 3 },
      fuzzy: 0.2,
      prefix: true
    }
  });

  miniSearch.addAll(docs);
  return miniSearch;
}
