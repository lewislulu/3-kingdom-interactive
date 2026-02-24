#!/usr/bin/env python3
"""离线数据构建脚本（首期示例）。

流程：
1. 读取基础结构化数据
2. 执行别名归一和去重
3. 输出 dataset.json
4. 生成基础 search_index.json
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "sgyy_phase1"


def load_json(file_name: str):
    path = DATA_DIR / file_name
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(file_name: str, payload):
    path = DATA_DIR / file_name
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def normalize_aliases(characters: list[dict]) -> list[dict]:
    for character in characters:
        aliases = character.get("aliases", [])
        uniq = []
        seen = set()
        for alias in aliases:
            norm = alias.strip()
            if norm and norm not in seen:
                seen.add(norm)
                uniq.append(norm)
        character["aliases"] = uniq
    return characters


def build_search_index(characters: list[dict], events: list[dict]) -> list[dict]:
    docs = []

    for character in characters:
        docs.append(
            {
                "id": f"character:{character['id']}",
                "type": "character",
                "title": character["name"],
                "chapter": character["first_chapter"],
                "content": " ".join(
                    [character["name"], *character.get("aliases", []), character.get("intro", "")]
                ),
            }
        )

    for event in events:
        docs.append(
            {
                "id": f"event:{event['id']}",
                "type": "event",
                "title": event["title"],
                "chapter": event["chapter_start"],
                "content": " ".join(
                    [
                        event["title"],
                        event.get("summary_bg", ""),
                        event.get("summary_process", ""),
                        event.get("summary_result", ""),
                    ]
                ),
            }
        )

    return docs


def main():
    chapters = load_json("chapters.json")
    characters = normalize_aliases(load_json("characters.json"))
    events = load_json("events.json")
    timeline = load_json("timeline.json")

    dataset = {
        "chapters": chapters,
        "characters": characters,
        "events": events,
        "timeline": timeline,
    }

    save_json("dataset.json", dataset)
    save_json("search_index.json", build_search_index(characters, events))

    print("[offline_ai] dataset.json and search_index.json regenerated")


if __name__ == "__main__":
    main()
