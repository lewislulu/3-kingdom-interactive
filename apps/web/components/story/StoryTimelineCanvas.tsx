"use client";

import { useMemo, useRef, useState } from "react";
import type { Character, StoryEvent } from "@sgyy/schema";
import { buildStoryGeometry } from "@/lib/d3/story-layout";

type StoryTimelineCanvasProps = {
  characters: Character[];
  events: StoryEvent[];
  selectedEventId: string | null;
  hoveredCharacterId: string | null;
  zoom: number;
  getCharacterColor: (characterId: string) => string;
  getCharacterName: (characterId: string) => string;
  onSelectEvent: (eventId: string) => void;
  onHoverCharacter: (characterId: string | null) => void;
};

export function StoryTimelineCanvas({
  characters,
  events,
  selectedEventId,
  hoveredCharacterId,
  zoom,
  getCharacterColor,
  getCharacterName,
  onSelectEvent,
  onHoverCharacter
}: StoryTimelineCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0
  });
  const [isDragging, setIsDragging] = useState(false);

  const geometry = useMemo(() => buildStoryGeometry(characters, events, zoom), [characters, events, zoom]);
  const selectedEvent = events.find((item) => item.id === selectedEventId) ?? null;
  const visibleCharacterIds = useMemo(() => new Set(characters.map((character) => character.id)), [characters]);
  const hasValidHoveredCharacter = hoveredCharacterId ? visibleCharacterIds.has(hoveredCharacterId) : false;

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const target = event.target as HTMLElement;
    if (target.closest(".sample-node, .sample-lane-avatar")) return;

    const container = scrollRef.current;
    if (!container) return;

    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    };
    setIsDragging(true);
    container.setPointerCapture(event.pointerId);
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const container = scrollRef.current;
    const drag = dragStateRef.current;
    if (!container || !drag.active) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    container.scrollLeft = drag.scrollLeft - dx;
    container.scrollTop = drag.scrollTop - dy;
  };

  const endDragging = (pointerId: number | null = null) => {
    const container = scrollRef.current;
    if (!container) return;

    if (pointerId !== null && container.hasPointerCapture(pointerId)) {
      container.releasePointerCapture(pointerId);
    }
    dragStateRef.current.active = false;
    setIsDragging(false);
  };

  return (
    <div
      ref={scrollRef}
      className={`sample-canvas-scroll custom-scrollbar ${isDragging ? "dragging" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => endDragging(event.pointerId)}
      onPointerLeave={() => endDragging()}
      onPointerCancel={() => endDragging()}
    >
      <div className="sample-canvas-inner" style={{ width: geometry.width, height: geometry.height }}>
        <svg className="sample-svg" width={geometry.width} height={geometry.height}>
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <pattern id="sample-grid" width={geometry.colWidth} height={geometry.rowHeight} patternUnits="userSpaceOnUse">
              <circle cx="2" cy={geometry.rowHeight / 2} r="1" fill="#334155" opacity="0.5" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#sample-grid)" />

          {geometry.laneYs.map((laneY) => (
            <line key={`lane-${laneY}`} x1={0} y1={laneY} x2={geometry.width} y2={laneY} stroke="#16223a" strokeWidth={1} opacity={0.28} />
          ))}

          {geometry.chapterMarkers.map((marker) => (
            <g key={`chapter-${marker.chapter}`}>
              <line x1={marker.x} y1={0} x2={marker.x} y2={geometry.height} stroke="#26334a" strokeWidth={1} opacity={0.85} />
              <text x={marker.x + 6} y={18} fill="#64748b" fontSize={11}>
                第{marker.chapter}回
              </text>
            </g>
          ))}

          {geometry.paths.map((path) => {
            const isHovered = hoveredCharacterId === path.characterId;
            const inSelectedEvent = selectedEvent?.character_ids.includes(path.characterId) ?? false;
            const active = isHovered || inSelectedEvent;
            const shouldFocus = hasValidHoveredCharacter || Boolean(selectedEventId);
            const dim = shouldFocus && !active;
            const color = getCharacterColor(path.characterId);

            return (
              <g key={path.characterId} className="sample-path" style={{ opacity: dim ? 0.08 : 1 }}>
                <path
                  d={path.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={active ? Math.max(7, 8 * zoom) : Math.max(5, 6 * zoom)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={active ? 0.25 : 0.2}
                  filter="url(#glow)"
                />
                <path
                  d={path.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={active ? Math.max(3.4, 4.2 * zoom) : Math.max(2.2, 3 * zoom)}
                  strokeOpacity={active ? 1 : 0.94}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onMouseEnter={() => onHoverCharacter(path.characterId)}
                  onMouseLeave={() => onHoverCharacter(null)}
                />
                {active && (
                  <path
                    d={path.d}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={Math.max(1.2, 1.7 * zoom)}
                    strokeOpacity={0.85}
                    strokeDasharray={`${Math.max(8, 10 * zoom)} ${Math.max(8, 10 * zoom)}`}
                    className="animate-flow"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {characters.map((character, index) => {
          const laneY = geometry.laneYs[index];
          if (typeof laneY !== "number") return null;

          const isHovered = hoveredCharacterId === character.id;
          const inSelectedEvent = selectedEvent?.character_ids.includes(character.id) ?? false;
          const active = isHovered || inSelectedEvent;
          const shouldFocus = hasValidHoveredCharacter || Boolean(selectedEventId);
          const dim = shouldFocus && !active;
          const characterName = getCharacterName(character.id);

          return (
            <button
              key={`lane-avatar-${character.id}`}
              type="button"
              className={`sample-lane-avatar ${active ? "active" : ""}`}
              style={{ left: geometry.lineStartX - 4, top: laneY, opacity: dim ? 0.22 : 1 }}
              onMouseEnter={() => onHoverCharacter(character.id)}
              onMouseLeave={() => onHoverCharacter(null)}
              onClick={() => onHoverCharacter(character.id)}
            >
              <span className="label">{characterName}</span>
              <span className="avatar">
                {character.avatar_url ? (
                  <img src={character.avatar_url} alt={characterName} />
                ) : (
                  <b style={{ backgroundColor: getCharacterColor(character.id) }}>{characterName.slice(0, 1)}</b>
                )}
              </span>
            </button>
          );
        })}

        {geometry.nodes.map((event) => {
          const isSelected = selectedEventId === event.id;
          return (
            <button
              key={`node-${event.id}`}
              type="button"
              className={`sample-node ${isSelected ? "selected" : ""}`}
              style={{ left: event.x, top: event.y }}
              onClick={() => onSelectEvent(event.id)}
            >
              <span className="ring" />
              <span className="meta">第{event.chapter}回</span>
              <span className="title">{event.title}</span>
              <span className="avatars">
                {event.character_ids.slice(0, 6).map((characterId) => (
                  <i
                    key={`dot-${event.id}-${characterId}`}
                    title={getCharacterName(characterId)}
                    style={{ backgroundColor: getCharacterColor(characterId) }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
