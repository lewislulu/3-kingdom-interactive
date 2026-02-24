#!/usr/bin/env python3
"""离线数据规则校验脚本。"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "sgyy_phase1"


def load_json(file_name: str):
    path = DATA_DIR / file_name
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    characters = load_json("characters.json")
    events = load_json("events.json")
    timeline = load_json("timeline.json")

    errors: list[str] = []
    character_ids = {item["id"] for item in characters}

    for event in events:
        if not event.get("evidence_refs"):
            errors.append(f"event {event['id']} missing evidence_refs")

        for cid in event.get("character_ids", []):
            if cid not in character_ids:
                errors.append(f"event {event['id']} references unknown character_id: {cid}")

    points_by_character = defaultdict(list)
    for point in timeline:
        cid = point.get("character_id")
        chapter = point.get("chapter")

        if cid not in character_ids:
            errors.append(f"timeline point references unknown character_id: {cid}")
            continue

        if not isinstance(chapter, int) or chapter < 1:
            errors.append(f"timeline point has invalid chapter: {point}")
            continue

        points_by_character[cid].append(chapter)

    for cid, chapters in points_by_character.items():
        for prev, cur in zip(chapters, chapters[1:]):
            if cur < prev:
                errors.append(f"timeline not monotonic for {cid}: {chapters}")
                break

    if errors:
        print("[offline_ai] validation failed:")
        for err in errors:
            print(f"- {err}")
        return 1

    print("[offline_ai] validation passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
