"use client";

import { useEffect, useMemo, useState } from "react";
import type { Character, StoryDataset } from "@sgyy/schema";
import { StoryTimelineCanvas } from "@/components/story/StoryTimelineCanvas";
import { buildSearchIndex } from "@/lib/search";
import { FEEDBACK_ISSUE_URL } from "@/lib/feedback";

type StoryWorkbenchProps = {
  dataset: StoryDataset;
};

const campPalette: Record<Character["camp"], string[]> = {
  蜀: ["#ef4444", "#fb7185", "#f97316", "#22c55e"],
  魏: ["#8b5cf6", "#6366f1", "#a78bfa", "#4f46e5"],
  吴: ["#eab308", "#f59e0b", "#22c55e", "#06b6d4"],
  晋: ["#64748b", "#94a3b8", "#475569", "#cbd5e1"],
  群雄: ["#f97316", "#f43f5e", "#ec4899", "#0ea5e9"],
  汉室: ["#06b6d4", "#22d3ee", "#0ea5e9", "#38bdf8"],
  其他: ["#f472b6", "#fb7185", "#a3a3a3", "#34d399"]
};

const characterColorOverrides: Record<string, string> = {
  liubei: "#ef4444",
  guanyu: "#22c55e",
  zhangfei: "#f97316",
  caocao: "#8b5cf6",
  dongzhuo: "#ec4899",
  yuanshao: "#38bdf8",
  lubu: "#f59e0b",
  zhaoyun: "#34d399",
  zhugeliang: "#3b82f6",
  simayi: "#94a3b8",
  sunquan: "#eab308",
  zhouyu: "#06b6d4"
};

function highContrastColorFromId(id: string): string {
  const seed = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const hue = seed % 360;
  return `hsl(${hue} 86% 62%)`;
}

function colorByCharacter(character: Character): string {
  const override = characterColorOverrides[character.id];
  if (override) return override;

  const palette = campPalette[character.camp] ?? ["#94a3b8"];
  const idx = Math.abs(
    [...character.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  ) % palette.length;
  return palette[idx] ?? highContrastColorFromId(character.id);
}

export function StoryWorkbench({ dataset }: StoryWorkbenchProps) {
  const { periods, characters, events, dialogues, evidence } = dataset;

  const [activePeriodId, setActivePeriodId] = useState(periods[0]?.id ?? "p1");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredCharacterId, setHoveredCharacterId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState("");
  const [expandedDialogueIds, setExpandedDialogueIds] = useState<Record<string, boolean>>({});
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Record<string, boolean>>({});

  const currentPeriod = periods.find((period) => period.id === activePeriodId) ?? periods[0];

  const currentEvents = useMemo(() => {
    return events
      .filter((event) => event.period_id === activePeriodId)
      .sort((a, b) => a.chapter - b.chapter || a.seq_in_chapter - b.seq_in_chapter);
  }, [activePeriodId, events]);

  const activeCharIdsInPeriod = useMemo(() => {
    return new Set(currentEvents.flatMap((event) => event.character_ids));
  }, [currentEvents]);

  const activeCharacters = useMemo(() => {
    return characters.filter((character) => activeCharIdsInPeriod.has(character.id));
  }, [activeCharIdsInPeriod, characters]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return currentEvents.find((event) => event.id === selectedEventId) ?? null;
  }, [currentEvents, selectedEventId]);

  const selectedDialogues = useMemo(() => {
    if (!selectedEvent) return [];
    return dialogues.filter((dialogue) => dialogue.event_id === selectedEvent.id);
  }, [dialogues, selectedEvent]);

  const evidenceFullTextById = useMemo(() => {
    const map = new Map<string, string>();
    for (const dialogue of selectedDialogues) {
      for (const evidenceId of dialogue.evidence_ref_ids) {
        if (!map.has(evidenceId) && dialogue.full_text) {
          map.set(evidenceId, dialogue.full_text);
        }
      }
    }
    return map;
  }, [selectedDialogues]);

  const evidenceById = useMemo(() => new Map(evidence.map((item) => [item.id, item])), [evidence]);

  const charById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters]);

  const getCharacterColor = (characterId: string) => {
    const character = charById.get(characterId);
    if (!character) return "#94a3b8";
    return colorByCharacter(character);
  };

  const getCharacterName = (characterId: string) => charById.get(characterId)?.name ?? characterId;

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const idx = buildSearchIndex(characters, events, dialogues, evidence);
    return idx.search(query).slice(0, 8);
  }, [characters, dialogues, evidence, events, query]);

  const changePeriod = (id: string) => {
    setActivePeriodId(id);
    setSelectedEventId(null);
    setHoveredCharacterId(null);
  };

  useEffect(() => {
    setExpandedDialogueIds({});
    setExpandedEvidenceIds({});
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEventId(null);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [selectedEventId]);

  return (
    <div className="sample-shell">
      <header className="sample-header">
        <div className="title-block">
          <h1>三国演义 <span>时空交汇仪</span></h1>
          <p>{currentPeriod.title} · {currentPeriod.description}</p>
        </div>
        <nav>
          <a href="/search">搜索</a>
          <a href="/epilogue">终章</a>
          <a href={FEEDBACK_ISSUE_URL} target="_blank" rel="noreferrer">反馈</a>
        </nav>
      </header>

      <section className="sample-tabs">
        {periods.map((period) => (
          <button
            key={period.id}
            onClick={() => changePeriod(period.id)}
            className={period.id === activePeriodId ? "active" : ""}
            title={period.description}
            type="button"
          >
            {period.title}
          </button>
        ))}
      </section>

      <section className="sample-tools">
        <label>
          检索
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="人物 / 事件 / 原文摘录"
          />
        </label>
        <label>
          缩放
          <div className="zoom-tools">
            <button type="button" onClick={() => setZoom((prev) => Math.min(prev + 0.2, 2))}>+</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((prev) => Math.max(prev - 0.2, 0.5))}>-</button>
          </div>
        </label>
      </section>

      {searchResults.length > 0 && (
        <section className="sample-search-results">
          {searchResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.type === "event") {
                  const event = events.find((evt) => evt.id === item.ref_id);
                  if (event) {
                    setActivePeriodId(event.period_id);
                    setSelectedEventId(event.id);
                  }
                }
                if (item.type === "character") {
                  setHoveredCharacterId(item.ref_id);
                  const event = events.find((evt) => evt.character_ids.includes(item.ref_id));
                  if (event) {
                    setActivePeriodId(event.period_id);
                  }
                  const scopedEvent = currentEvents.find((evt) => evt.character_ids.includes(item.ref_id));
                  if (scopedEvent) {
                    setSelectedEventId(scopedEvent.id);
                    return;
                  }
                  const fallbackEvent = event;
                  if (fallbackEvent) {
                    setSelectedEventId(fallbackEvent.id);
                  }
                }
                if (item.type === "quote") {
                  const dialogue = dialogues.find((dlg) => dlg.id === item.ref_id);
                  if (!dialogue) return;
                  const event = events.find((evt) => evt.id === dialogue.event_id);
                  if (!event) return;
                  setActivePeriodId(event.period_id);
                  setSelectedEventId(event.id);
                  setExpandedDialogueIds((prev) => ({ ...prev, [dialogue.id]: true }));
                }
              }}
            >
              <span>{item.type}</span>
              <strong>{item.title}</strong>
              <em>第{item.chapter}回</em>
            </button>
          ))}
        </section>
      )}

      <main className="sample-main">
        <section className="sample-stage">
          <StoryTimelineCanvas
            characters={activeCharacters}
            events={currentEvents}
            selectedEventId={selectedEvent?.id ?? null}
            hoveredCharacterId={hoveredCharacterId}
            zoom={zoom}
            getCharacterColor={getCharacterColor}
            getCharacterName={getCharacterName}
            onSelectEvent={setSelectedEventId}
            onHoverCharacter={setHoveredCharacterId}
          />
        </section>

        {selectedEvent && (
          <button
            type="button"
            aria-label="关闭详情遮罩"
            className="sample-drawer-overlay"
            onClick={() => setSelectedEventId(null)}
          />
        )}

        <aside className={`sample-drawer ${selectedEvent ? "open" : ""}`}>
          {selectedEvent && (
            <>
              <div className="drawer-head">
                <div className="drawer-head-main">
                  <p className="drawer-kicker">事件详情</p>
                  <h2>{selectedEvent.title}</h2>
                  <div className="drawer-meta">
                    <small>第{selectedEvent.chapter}回</small>
                    <small>影响度 {selectedEvent.impact_score}</small>
                    <small>人物 {selectedEvent.character_ids.length}</small>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedEventId(null)} aria-label="关闭详情">关闭</button>
              </div>

              <div className="drawer-body custom-scrollbar">
                <section className="detail-card">
                  <h3 className="detail-title">命运交汇人物</h3>
                  <div className="char-tags">
                    {selectedEvent.character_ids.map((id) => (
                      <span key={id}>
                        <i style={{ backgroundColor: getCharacterColor(id) }} />
                        {getCharacterName(id)}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="detail-card detail-narrative">
                  <h3 className="detail-title">叙事脉络</h3>
                  <ol className="narrative-flow">
                    <li>
                      <div className="flow-node">
                        <span>01</span>
                        <strong>事件背景</strong>
                      </div>
                      <p>{selectedEvent.background}</p>
                    </li>
                    <li>
                      <div className="flow-node">
                        <span>02</span>
                        <strong>事件经过</strong>
                      </div>
                      <p>{selectedEvent.process}</p>
                    </li>
                    <li>
                      <div className="flow-node">
                        <span>03</span>
                        <strong>历史影响</strong>
                      </div>
                      <p>{selectedEvent.result}</p>
                    </li>
                  </ol>
                </section>

                <section className="detail-card">
                  <h3 className="detail-title">关键对话</h3>
                  <div className="dialogues">
                    {selectedDialogues.length > 0 ? (
                      selectedDialogues.map((dialogue) => {
                        const expanded = Boolean(expandedDialogueIds[dialogue.id]);
                        return (
                          <article key={dialogue.id}>
                            <div className="dialogue-head">
                              <strong>{getCharacterName(dialogue.speaker_id)}</strong>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedDialogueIds((prev) => ({
                                    ...prev,
                                    [dialogue.id]: !prev[dialogue.id]
                                  }))
                                }
                              >
                                {expanded ? "收起全文" : "展开全文"}
                              </button>
                            </div>
                            <p>{dialogue.excerpt}</p>
                            {expanded && <blockquote>{dialogue.full_text}</blockquote>}
                          </article>
                        );
                      })
                    ) : (
                      <p className="empty-tip">当前事件暂无可展示对话。</p>
                    )}
                  </div>
                </section>

                <section className="detail-card">
                  <h3 className="detail-title">证据引用</h3>
                  <ul className="evidence-list">
                    {selectedEvent.evidence_ref_ids.map((evidenceId) => {
                      const item = evidenceById.get(evidenceId);
                      if (!item) return null;
                      const fullText = evidenceFullTextById.get(evidenceId);
                      const expanded = Boolean(expandedEvidenceIds[evidenceId]);
                      return (
                        <li key={evidenceId}>
                          <span>第{item.chapter}回 · 段落 {item.paragraph_start}-{item.paragraph_end}</span>
                          <p>{item.quote_excerpt}</p>
                          {fullText && (
                            <button
                              type="button"
                              className="evidence-toggle"
                              onClick={() =>
                                setExpandedEvidenceIds((prev) => ({
                                  ...prev,
                                  [evidenceId]: !prev[evidenceId]
                                }))
                              }
                            >
                              {expanded ? "收起原文全文" : "展开原文全文"}
                            </button>
                          )}
                          {expanded && fullText && <blockquote className="evidence-fulltext">{fullText}</blockquote>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
