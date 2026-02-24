import { z } from "zod";

export const campValues = ["蜀", "魏", "吴", "晋", "群雄", "汉室", "其他"] as const;

export const PeriodSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  chapter_start: z.number().int().min(1),
  chapter_end: z.number().int().min(1),
  description: z.string().min(1)
});

export const ChapterSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1).max(120),
  title: z.string().min(1),
  period_id: z.string().min(1)
});

export const CharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  camp: z.enum(campValues),
  title: z.string().min(1),
  intro: z.string().min(1),
  avatar_url: z.string().min(1).optional(),
  first_chapter: z.number().int().min(1),
  last_chapter: z.number().int().min(1),
  importance: z.number().int().min(1).max(10)
});

export const EvidenceRefSchema = z.object({
  id: z.string().min(1),
  chapter: z.number().int().min(1).max(120),
  paragraph_start: z.number().int().min(1),
  paragraph_end: z.number().int().min(1),
  quote_excerpt: z.string().min(1),
  source_version: z.string().min(1)
});

export const StoryEventSchema = z.object({
  id: z.string().min(1),
  chapter: z.number().int().min(1).max(120),
  period_id: z.string().min(1),
  seq_in_chapter: z.number().int().min(1),
  title: z.string().min(1),
  background: z.string().min(1),
  process: z.string().min(1),
  result: z.string().min(1),
  impact_score: z.number().min(0).max(100),
  character_ids: z.array(z.string().min(1)).min(1),
  evidence_ref_ids: z.array(z.string().min(1)).min(1)
});

export const DialogueSchema = z.object({
  id: z.string().min(1),
  event_id: z.string().min(1),
  speaker_id: z.string().min(1),
  excerpt: z.string().min(1),
  full_text: z.string().min(1),
  evidence_ref_ids: z.array(z.string().min(1)).min(1)
});

export const CoverageMapSchema = z.object({
  chapter: z.number().int().min(1).max(120),
  paragraph: z.number().int().min(1),
  event_id: z.string().min(1)
});

export const EpilogueEventSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  linked_event_ids: z.array(z.string().min(1))
});

export const StoryDatasetSchema = z.object({
  periods: z.array(PeriodSchema).min(1),
  chapters: z.array(ChapterSchema).min(1),
  characters: z.array(CharacterSchema).min(1),
  events: z.array(StoryEventSchema).min(1),
  dialogues: z.array(DialogueSchema).min(1),
  evidence: z.array(EvidenceRefSchema).min(1),
  coverage: z.array(CoverageMapSchema).min(1),
  epilogue: z.array(EpilogueEventSchema).min(1)
});

export type Period = z.infer<typeof PeriodSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
export type StoryEvent = z.infer<typeof StoryEventSchema>;
export type Dialogue = z.infer<typeof DialogueSchema>;
export type CoverageMap = z.infer<typeof CoverageMapSchema>;
export type EpilogueEvent = z.infer<typeof EpilogueEventSchema>;
export type StoryDataset = z.infer<typeof StoryDatasetSchema>;

export function validateStoryDataset(data: unknown): StoryDataset {
  return StoryDatasetSchema.parse(data);
}
