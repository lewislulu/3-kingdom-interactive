import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateStoryDataset } from "@sgyy/schema";

const DATA_DIR = path.resolve(__dirname, "../data/sgyy_full");

function load<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), "utf-8")) as T;
}

describe("sgyy full dataset contracts", () => {
  const periods = load<unknown[]>("periods");
  const chapters = load<unknown[]>("chapters");
  const characters = load<unknown[]>("characters");
  const events = load<unknown[]>("events");
  const dialogues = load<unknown[]>("dialogues");
  const evidence = load<unknown[]>("evidence");
  const coverage = load<unknown[]>("coverage");
  const epilogue = load<unknown[]>("epilogue");

  const dataset = validateStoryDataset({
    periods,
    chapters,
    characters,
    events,
    dialogues,
    evidence,
    coverage,
    epilogue
  });

  it("should include full 1..120 chapter range", () => {
    const chapterNumbers = new Set(dataset.chapters.map((item) => item.number));
    for (let chapter = 1; chapter <= 120; chapter += 1) {
      expect(chapterNumbers.has(chapter)).toBe(true);
    }
  });

  it("every event should bind evidence refs", () => {
    const evidenceIds = new Set(dataset.evidence.map((item) => item.id));
    for (const event of dataset.events) {
      expect(event.evidence_ref_ids.length).toBeGreaterThan(0);
      for (const id of event.evidence_ref_ids) {
        expect(evidenceIds.has(id), `${event.id} missing evidence ${id}`).toBe(true);
      }
    }
  });

  it("dialogues should bind event and evidence", () => {
    const eventIds = new Set(dataset.events.map((item) => item.id));
    const evidenceIds = new Set(dataset.evidence.map((item) => item.id));

    for (const dialogue of dataset.dialogues) {
      expect(eventIds.has(dialogue.event_id), `${dialogue.id} invalid event`).toBe(true);
      expect(dialogue.evidence_ref_ids.length).toBeGreaterThan(0);
      for (const id of dialogue.evidence_ref_ids) {
        expect(evidenceIds.has(id), `${dialogue.id} invalid evidence`).toBe(true);
      }
    }
  });

  it("coverage should cover every chapter", () => {
    const covered = new Set(dataset.coverage.map((item) => item.chapter));
    for (let chapter = 1; chapter <= 120; chapter += 1) {
      expect(covered.has(chapter), `missing chapter coverage ${chapter}`).toBe(true);
    }
  });
});
