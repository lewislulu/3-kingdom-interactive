import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { type StoryDataset, validateStoryDataset } from "@sgyy/schema";

const DATA_DIR_CANDIDATES = [
  path.resolve(process.cwd(), "data/sgyy_full"),
  path.resolve(process.cwd(), "../../data/sgyy_full"),
  path.resolve(process.cwd(), "../../../data/sgyy_full")
];

async function locateDataDir(): Promise<string> {
  for (const dir of DATA_DIR_CANDIDATES) {
    try {
      await fs.access(dir);
      return dir;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error("Unable to locate data/sgyy_full directory.");
}

async function readJson<T>(fileName: string): Promise<T> {
  const dataDir = await locateDataDir();
  const fullPath = path.join(dataDir, fileName);
  const raw = await fs.readFile(fullPath, "utf-8");
  return JSON.parse(raw) as T;
}

export const getStoryDataset = cache(async (): Promise<StoryDataset> => {
  const [periods, chapters, characters, events, dialogues, evidence, coverage, epilogue] = await Promise.all([
    readJson<StoryDataset["periods"]>("periods.json"),
    readJson<StoryDataset["chapters"]>("chapters.json"),
    readJson<StoryDataset["characters"]>("characters.json"),
    readJson<StoryDataset["events"]>("events.json"),
    readJson<StoryDataset["dialogues"]>("dialogues.json"),
    readJson<StoryDataset["evidence"]>("evidence.json"),
    readJson<StoryDataset["coverage"]>("coverage.json"),
    readJson<StoryDataset["epilogue"]>("epilogue.json")
  ]);

  return validateStoryDataset({
    periods,
    chapters,
    characters,
    events,
    dialogues,
    evidence,
    coverage,
    epilogue
  });
});

export async function getDataVersionMeta() {
  const dataset = await getStoryDataset();
  return {
    periods: dataset.periods.length,
    chapters: dataset.chapters.length,
    characters: dataset.characters.length,
    events: dataset.events.length,
    dialogues: dataset.dialogues.length,
    evidence: dataset.evidence.length
  };
}
