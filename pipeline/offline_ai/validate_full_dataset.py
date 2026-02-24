#!/usr/bin/env python3
"""Validate /data/sgyy_full dataset integrity."""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "sgyy_full"


def load(name: str):
    path = DATA_DIR / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    periods = load("periods")
    chapters = load("chapters")
    characters = load("characters")
    events = load("events")
    dialogues = load("dialogues")
    evidence = load("evidence")
    coverage = load("coverage")
    epilogue = load("epilogue")

    errors: list[str] = []

    if len(chapters) != 120:
        errors.append(f"expected 120 chapters, got {len(chapters)}")

    chapter_numbers = {chapter["number"] for chapter in chapters}
    if chapter_numbers != set(range(1, 121)):
        errors.append("chapter numbers are not a complete 1..120 range")

    period_ids = {period["id"] for period in periods}
    char_ids = {character["id"] for character in characters}
    event_ids = {event["id"] for event in events}
    evidence_ids = {item["id"] for item in evidence}

    for chapter in chapters:
        if chapter["period_id"] not in period_ids:
            errors.append(f"chapter {chapter['number']} has invalid period_id")

    chapter_event_order = defaultdict(list)
    for event in events:
        if event["period_id"] not in period_ids:
            errors.append(f"event {event['id']} has invalid period_id")
        for cid in event["character_ids"]:
            if cid not in char_ids:
                errors.append(f"event {event['id']} references unknown character {cid}")
        for eid in event["evidence_ref_ids"]:
            if eid not in evidence_ids:
                errors.append(f"event {event['id']} references unknown evidence {eid}")
        chapter_event_order[event["chapter"]].append(event["seq_in_chapter"])

    for chapter, seqs in chapter_event_order.items():
        if sorted(seqs) != list(range(1, len(seqs) + 1)):
            errors.append(f"chapter {chapter} seq_in_chapter is not contiguous: {seqs}")

    for dialogue in dialogues:
        if dialogue["event_id"] not in event_ids:
            errors.append(f"dialogue {dialogue['id']} references unknown event")
        if dialogue["speaker_id"] not in char_ids:
            errors.append(f"dialogue {dialogue['id']} references unknown speaker")
        for eid in dialogue["evidence_ref_ids"]:
            if eid not in evidence_ids:
                errors.append(f"dialogue {dialogue['id']} references unknown evidence {eid}")

    coverage_by_chapter = defaultdict(set)
    for item in coverage:
        if item["event_id"] not in event_ids:
            errors.append(f"coverage item references unknown event {item['event_id']}")
        coverage_by_chapter[item["chapter"]].add(item["paragraph"])

    for chapter in range(1, 121):
        if chapter not in coverage_by_chapter:
            errors.append(f"chapter {chapter} missing coverage")

    for item in epilogue:
        for event_id in item["linked_event_ids"]:
            if event_id and event_id not in event_ids:
                errors.append(f"epilogue {item['id']} links missing event {event_id}")

    if errors:
        print("[full_validate] FAILED")
        for err in errors:
            print(f"- {err}")
        return 1

    print("[full_validate] PASSED")
    print(f"periods={len(periods)} chapters={len(chapters)} events={len(events)} dialogues={len(dialogues)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
