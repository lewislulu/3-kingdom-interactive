/**
 * Timeline Engine -- D3-based horizontal storyline layout
 *
 * Supports:
 * - Chapter-based filtering (show subset of characters/events)
 * - Personal events on character lines (diamond markers)
 * - Shared events at character intersections (gold circles)
 * - Era background bands, time axis
 * - Pan/zoom with cinematic transitions
 * - Biography mode (single character focus)
 */
import * as d3 from 'd3';
import { generatePortraitPlaceholder } from '../utils/helpers.js';

// Layout constants
const MARGIN = { top: 120, right: 80, bottom: 60, left: 140 };
const LINE_SPACING = 100;
const CHARACTER_START_OFFSET = 60;

export class Timeline {
  constructor(container, data) {
    this.container = container;
    this.data = data;
    this.characters = data.characters;
    this.events = data.events;
    this.timeline = data.timeline;

    // Current view state
    this.currentChapter = null; // null = overview
    this.biographyCharacter = null; // null = normal mode
    this.activeCharacters = [...this.timeline.characters];
    this.activeEvents = [...this.timeline.events];
    this.activeTimeRange = [...this.timeline.timeRange];

    // Dimensions
    this.width = 0;
    this.height = 0;
    this.innerWidth = 0;
    this.innerHeight = 0;

    // Scales
    this.xScale = null;
    this.yScale = null;

    // D3 selections
    this.svg = null;
    this.mainGroup = null;
    this.zoomBehavior = null;
    this.currentTransform = d3.zoomIdentity;

    // Callbacks
    this.onEventClick = null;
    this.onCharacterClick = null;
    this.onPersonalEventHover = null;
    this.onPersonalEventLeave = null;
    this.onZoomChange = null;
    this.onChapterChange = null;

    // State
    this.highlightedCharacter = null;

    this._init();
  }

  _init() {
    this.svg = d3.select(this.container);
    this._updateDimensions();
    this._createDefs();
    this._createGroups();
    this._createScales();
    this._render();
    this._setupZoom();

    window.addEventListener('resize', () => {
      this._updateDimensions();
      this._createScales();
      this._render();
    });
  }

  // ── Chapter & View Management ──────────────────────

  /**
   * Switch to a specific chapter, or null for overview
   */
  setChapter(chapterId) {
    if (chapterId === this.currentChapter) return;

    this.currentChapter = chapterId;
    this.biographyCharacter = null;

    if (chapterId === null) {
      // Overview mode
      this.activeCharacters = [...this.timeline.characters];
      this.activeEvents = [...this.timeline.events];
      this.activeTimeRange = [...this.timeline.timeRange];
    } else {
      const chapter = this.timeline.chapters.find((c) => c.id === chapterId);
      if (!chapter) return;
      this.activeCharacters = [...chapter.characters];
      this.activeEvents = [...chapter.events];
      // Pad the start by 2 years so character lines have a parallel lead-in
      // before the first event (avoids lines converging right at the edge)
      this.activeTimeRange = [chapter.timeRange[0] - 2, chapter.timeRange[1]];
    }

    this._updateDimensions();
    this._createScales();
    this._render();
    this._fitView(true);

    if (this.onChapterChange) this.onChapterChange(chapterId);
  }

  /**
   * Enter biography mode for a single character
   */
  setBiographyMode(charId) {
    if (charId === this.biographyCharacter) return;

    this.biographyCharacter = charId;

    if (charId) {
      const char = this.characters[charId];
      if (!char) return;

      this.activeCharacters = [charId];
      // Show all events this character participates in
      this.activeEvents = this.timeline.events.filter((eid) => {
        const ev = this.events[eid];
        return ev && ev.characters.includes(charId);
      });
      // Expand time range to cover all personal events too
      const personalYears = (char.personalEvents || []).map((pe) => pe.year);
      const eventYears = this.activeEvents.map((eid) => this.events[eid]?.year).filter(Boolean);
      const allYears = [...personalYears, ...eventYears, ...char.activeRange];
      this.activeTimeRange = [Math.min(...allYears) - 2, Math.max(...allYears) + 2];
    } else {
      // Exit biography mode: restore chapter or overview
      this.setChapter(this.currentChapter);
      return;
    }

    this._updateDimensions();
    this._createScales();
    this._render();
    this._fitView(true);
  }

  getCurrentChapter() {
    return this.currentChapter;
  }

  // ── Dimensions & Scales ────────────────────────────

  _updateDimensions() {
    const rect = this.svg.node().parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    const yearSpan = this.activeTimeRange[1] - this.activeTimeRange[0];
    this.innerWidth = Math.max(yearSpan * 50, this.width * 1.5, 1200);
    this.innerHeight = MARGIN.top + Math.max(this.activeCharacters.length - 1, 0) * LINE_SPACING + MARGIN.bottom + 60;

    this.svg
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', `0 0 ${this.width} ${this.height}`);
  }

  _createScales() {
    const [yearStart, yearEnd] = this.activeTimeRange;
    this.xScale = d3.scaleLinear()
      .domain([yearStart, yearEnd])
      .range([MARGIN.left + CHARACTER_START_OFFSET, this.innerWidth - MARGIN.right]);

    this.yScale = d3.scalePoint()
      .domain(this.activeCharacters)
      .range([MARGIN.top, MARGIN.top + Math.max(this.activeCharacters.length - 1, 0) * LINE_SPACING])
      .padding(0);
  }

  // ── SVG Defs ───────────────────────────────────────

  _createDefs() {
    const defs = this.svg.append('defs');

    // NOTE: SVG feGaussianBlur filters removed for performance.
    // Character lines use a single path per character (no duplicate glow/hitarea paths).

    // Era gradients
    this.timeline.eras.forEach((era, i) => {
      const grad = defs.append('linearGradient')
        .attr('id', `era-grad-${i}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');
      grad.append('stop').attr('offset', '0%')
        .attr('stop-color', i % 2 === 0 ? 'rgba(212,168,83,0.03)' : 'rgba(91,140,184,0.03)');
      grad.append('stop').attr('offset', '100%').attr('stop-color', 'transparent');
    });
  }

  _createGroups() {
    this.mainGroup = this.svg.append('g').attr('class', 'main-group')
      .style('will-change', 'transform');
    this.eraGroup = this.mainGroup.append('g').attr('class', 'era-layer');
    this.gridGroup = this.mainGroup.append('g').attr('class', 'grid-layer');
    this.lineGroup = this.mainGroup.append('g').attr('class', 'line-layer');
    this.personalGroup = this.mainGroup.append('g').attr('class', 'personal-layer');
    this.nodeGroup = this.mainGroup.append('g').attr('class', 'node-layer');
    this.labelGroup = this.mainGroup.append('g').attr('class', 'label-layer');
    this.charStartGroup = this.mainGroup.append('g').attr('class', 'char-start-layer');
  }

  // ── Render Pipeline ────────────────────────────────

  _render() {
    this._renderEras();
    this._renderGrid();
    this._renderCharacterLines();
    this._renderPersonalEvents();
    this._renderEventNodes();
    this._renderCharacterStarts();
  }

  _renderEras() {
    this.eraGroup.selectAll('*').remove();
    const fullHeight = this.innerHeight;
    const [viewStart, viewEnd] = this.activeTimeRange;

    this.timeline.eras.forEach((era, i) => {
      // Only render eras within active time range
      if (era.end < viewStart || era.start > viewEnd) return;

      const x1 = this.xScale(Math.max(era.start, viewStart));
      const x2 = this.xScale(Math.min(era.end, viewEnd));

      this.eraGroup.append('rect')
        .attr('x', x1).attr('y', 0)
        .attr('width', x2 - x1).attr('height', fullHeight)
        .attr('fill', `url(#era-grad-${i})`);

      const midX = (x1 + x2) / 2;
      this.eraGroup.append('text')
        .attr('class', 'era-label')
        .attr('x', midX).attr('y', 30)
        .attr('text-anchor', 'middle')
        .text(era.name);

      this.eraGroup.append('line')
        .attr('x1', x1).attr('y1', 0)
        .attr('x2', x1).attr('y2', fullHeight)
        .attr('stroke', 'rgba(255,255,255,0.04)')
        .attr('stroke-dasharray', '4,8');
    });
  }

  _renderGrid() {
    this.gridGroup.selectAll('*').remove();
    const [yearStart, yearEnd] = this.activeTimeRange;

    for (let year = Math.floor(yearStart); year <= Math.ceil(yearEnd); year++) {
      const x = this.xScale(year);
      if (year % 5 === 0) {
        this.gridGroup.append('line')
          .attr('x1', x).attr('y1', MARGIN.top - 20)
          .attr('x2', x).attr('y2', this.innerHeight)
          .attr('stroke', 'rgba(255,255,255,0.04)').attr('stroke-width', 1);

        this.gridGroup.append('text')
          .attr('x', x).attr('y', MARGIN.top - 28)
          .attr('text-anchor', 'middle')
          .attr('font-family', "'SF Mono', 'Fira Code', monospace")
          .attr('font-size', '11px')
          .attr('fill', year % 10 === 0 ? 'rgba(212,168,83,0.6)' : 'rgba(255,255,255,0.2)')
          .text(`第${year}回`);
      }
    }
  }

  /**
   * Compute the effective line start year for a character.
   * Extends backwards if the first multi-character event is too close
   * to the raw start, ensuring a visible parallel lead-in segment.
   */
  _getEffectiveLineStart(charId) {
    const char = this.characters[charId];
    if (!char) return this.activeTimeRange[0];

    const rawStart = Math.max(char.activeRange[0], this.activeTimeRange[0]);
    const LEAD_IN_YEARS = 2;

    for (const eid of this.activeEvents) {
      const ev = this.events[eid];
      if (!ev || !ev.characters.includes(charId)) continue;
      const activeCharsInEvent = ev.characters.filter(
        (cid) => this.activeCharacters.includes(cid)
      );
      if (activeCharsInEvent.length < 2) continue;
      if (ev.year >= rawStart && ev.year <= rawStart + LEAD_IN_YEARS) {
        return Math.max(ev.year - LEAD_IN_YEARS, this.activeTimeRange[0]);
      }
    }
    return rawStart;
  }

  /**
   * Build convergence waypoints for a character.
   * At multi-character events, the line bends toward the event center Y.
   */
  _buildConvergencePoints(charId) {
    const char = this.characters[charId];
    if (!char) return [];

    const baseY = this.yScale(charId);
    const lineStart = Math.max(char.activeRange[0], this.activeTimeRange[0]);
    const lineEnd = Math.min(char.activeRange[1], this.activeTimeRange[1]);
    if (lineStart >= lineEnd) return [];

    // Find multi-character events this character participates in
    const convergenceEvents = [];
    this.activeEvents.forEach((eid) => {
      const ev = this.events[eid];
      if (!ev) return;
      const activeCharsInEvent = ev.characters.filter(
        (cid) => this.activeCharacters.includes(cid)
      );
      if (activeCharsInEvent.length < 2 || !activeCharsInEvent.includes(charId)) return;
      if (ev.year < lineStart || ev.year > lineEnd) return;

      const charYs = activeCharsInEvent.map((cid) => this.yScale(cid)).filter((y) => y !== undefined);
      const centerY = (Math.min(...charYs) + Math.max(...charYs)) / 2;

      convergenceEvents.push({
        x: this.xScale(ev.year),
        centerY,
        isMajor: ev.importance === 'major',
      });
    });

    // Sort by x position
    convergenceEvents.sort((a, b) => a.x - b.x);

    return convergenceEvents;
  }

  /**
   * Generate SVG path string for a character line with convergence bends.
   */
  _buildCharacterPath(charId) {
    const char = this.characters[charId];
    if (!char) return '';

    const baseY = this.yScale(charId);
    const lineStart = this._getEffectiveLineStart(charId);
    const lineEnd = Math.min(char.activeRange[1], this.activeTimeRange[1]);
    if (lineStart >= lineEnd) return '';

    const x1 = this.xScale(lineStart);
    const x2 = this.xScale(lineEnd);
    const convergencePoints = this._buildConvergencePoints(charId);

    if (convergencePoints.length === 0) {
      // No convergence — straight line
      return `M ${x1} ${baseY} L ${x2} ${baseY}`;
    }

    // Approach distance for Bezier curves (how far before the event the line starts bending)
    const APPROACH = 30;
    // Minimum parallel lead-in at the start of each line so lanes establish clearly
    const LEAD_IN = 60;
    const safeStartX = x1 + LEAD_IN;

    let d = `M ${x1} ${baseY}`;
    let currentX = x1;

    convergencePoints.forEach((cp) => {
      // Don't start bending before the lead-in zone ends
      const approachX = Math.max(cp.x - APPROACH, currentX, safeStartX);
      const departX = Math.min(cp.x + APPROACH, x2);

      // Skip this convergence if the event is inside the lead-in zone
      // (the approach point would overshoot the event x)
      if (approachX >= cp.x) return;

      // Straight segment to approach point
      if (approachX > currentX) {
        d += ` L ${approachX} ${baseY}`;
      }

      // Cubic Bezier: approach → convergence point
      const ctrlApproachX = approachX + (cp.x - approachX) * 0.6;
      d += ` C ${ctrlApproachX} ${baseY}, ${cp.x} ${cp.centerY}, ${cp.x} ${cp.centerY}`;

      // Cubic Bezier: convergence point → depart
      const ctrlDepartX = cp.x + (departX - cp.x) * 0.4;
      d += ` C ${cp.x} ${cp.centerY}, ${ctrlDepartX} ${baseY}, ${departX} ${baseY}`;

      currentX = departX;
    });

    // Final straight segment to end
    if (currentX < x2) {
      d += ` L ${x2} ${baseY}`;
    }

    return d;
  }

  _renderCharacterLines() {
    this.lineGroup.selectAll('*').remove();

    // Pre-compute convergence data for glow rendering at convergence points
    this._convergenceData = {};

    this.activeCharacters.forEach((charId) => {
      const char = this.characters[charId];
      if (!char) return;

      const lineStart = this._getEffectiveLineStart(charId);
      const lineEnd = Math.min(char.activeRange[1], this.activeTimeRange[1]);
      if (lineStart >= lineEnd) return;

      const pathD = this._buildCharacterPath(charId);
      if (!pathD) return;

      const convergencePoints = this._buildConvergencePoints(charId);
      this._convergenceData[charId] = convergencePoints;

      // Main line (single path, no glow/hitarea duplicates)
      this.lineGroup.append('path')
        .attr('class', 'character-line')
        .attr('data-character', charId)
        .attr('d', pathD)
        .attr('fill', 'none')
        .attr('stroke', char.color)
        .attr('stroke-opacity', 0.7)
        .attr('cursor', 'pointer')
        .on('mouseenter', () => this._highlightCharacter(charId))
        .on('mouseleave', () => this._unhighlightCharacter());
    });

    // Render convergence glow spots at intersection points
    this._renderConvergenceGlows();
  }

  /**
   * Render glowing spots at convergence points where multiple character lines meet.
   */
  _renderConvergenceGlows() {
    // Collect unique convergence points (by x position)
    const pointMap = new Map();
    for (const [charId, points] of Object.entries(this._convergenceData)) {
      points.forEach((cp) => {
        const key = Math.round(cp.x);
        if (!pointMap.has(key)) {
          pointMap.set(key, { x: cp.x, centerY: cp.centerY, isMajor: cp.isMajor, count: 0 });
        }
        pointMap.get(key).count++;
      });
    }

    // Draw glow at each convergence point
    pointMap.forEach((cp) => {
      if (cp.count < 2) return; // Only glow when at least 2 lines converge

      const glowRadius = cp.isMajor ? 18 : 14;

      this.lineGroup.append('circle')
        .attr('class', 'convergence-glow')
        .attr('cx', cp.x)
        .attr('cy', cp.centerY)
        .attr('r', glowRadius)
        .attr('fill', '#d4a853')
        .attr('fill-opacity', 0.08);
    });
  }

  _renderPersonalEvents() {
    this.personalGroup.selectAll('*').remove();

    this.activeCharacters.forEach((charId) => {
      const char = this.characters[charId];
      if (!char || !char.personalEvents) return;

      const y = this.yScale(charId);
      const [viewStart, viewEnd] = this.activeTimeRange;

      char.personalEvents.forEach((pe) => {
        if (pe.year < viewStart || pe.year > viewEnd) return;

        const x = this.xScale(pe.year);
        const size = 5;

        const g = this.personalGroup.append('g')
          .attr('class', 'personal-event')
          .attr('data-character', charId)
          .attr('transform', `translate(${x}, ${y})`)
          .attr('cursor', 'pointer');

        // Diamond shape (rotated square)
        const diamondPath = `M 0 ${-size} L ${size} 0 L 0 ${size} L ${-size} 0 Z`;

        // Outer glow diamond
        g.append('path')
          .attr('d', diamondPath)
          .attr('fill', char.color)
          .attr('fill-opacity', 0.15)
          .attr('stroke', char.color)
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.4);

        // Inner diamond
        const innerSize = 3;
        const innerDiamond = `M 0 ${-innerSize} L ${innerSize} 0 L 0 ${innerSize} L ${-innerSize} 0 Z`;
        g.append('path')
          .attr('d', innerDiamond)
          .attr('fill', char.color)
          .attr('fill-opacity', 0.7);

        // Type indicator: turning-point gets a ring
        if (pe.type === 'turning-point') {
          const outerSize = size + 3;
          g.append('path')
            .attr('d', `M 0 ${-outerSize} L ${outerSize} 0 L 0 ${outerSize} L ${-outerSize} 0 Z`)
            .attr('fill', 'none')
            .attr('stroke', char.color)
            .attr('stroke-width', 0.8)
            .attr('stroke-opacity', 0.4);
        }

        // Label (shown in biography mode or on hover)
        const label = g.append('text')
          .attr('class', 'personal-label')
          .attr('y', -(size + 10))
          .attr('text-anchor', 'middle')
          .attr('font-family', "'Noto Serif SC', serif")
          .attr('font-size', '10px')
          .attr('fill', char.color)
          .attr('fill-opacity', this.biographyCharacter ? 0.8 : 0)
          .text(pe.title);

        // Year label
        const yearLabel = g.append('text')
          .attr('class', 'personal-year')
          .attr('y', size + 14)
          .attr('text-anchor', 'middle')
          .attr('font-family', "'SF Mono', monospace")
          .attr('font-size', '9px')
          .attr('fill', char.color)
          .attr('fill-opacity', this.biographyCharacter ? 0.4 : 0)
          .text(pe.year);

        // Hover interactions
        g.on('mouseenter', (event) => {
          d3.select(event.currentTarget).select('path')
            .transition().duration(200)
            .attr('fill-opacity', 0.5);
          label.transition().duration(200).attr('fill-opacity', 1);
          yearLabel.transition().duration(200).attr('fill-opacity', 0.6);

          if (this.onPersonalEventHover) {
            const bbox = event.currentTarget.getBoundingClientRect();
            this.onPersonalEventHover(pe, char, {
              x: bbox.x + bbox.width / 2,
              y: bbox.y,
            });
          }
        }).on('mouseleave', (event) => {
          d3.select(event.currentTarget).select('path')
            .transition().duration(200)
            .attr('fill-opacity', 0.15);
          if (!this.biographyCharacter) {
            label.transition().duration(200).attr('fill-opacity', 0);
            yearLabel.transition().duration(200).attr('fill-opacity', 0);
          }

          if (this.onPersonalEventLeave) {
            this.onPersonalEventLeave();
          }
        });
      });
    });
  }

  _renderCharacterStarts() {
    this.charStartGroup.selectAll('*').remove();

    this.activeCharacters.forEach((charId) => {
      const char = this.characters[charId];
      if (!char) return;

      const y = this.yScale(charId);
      const lineStart = this._getEffectiveLineStart(charId);
      const x = this.xScale(lineStart) - 50;

      const g = this.charStartGroup.append('g')
        .attr('class', 'char-start')
        .attr('transform', `translate(${x}, ${y})`)
        .attr('cursor', 'pointer')
        .on('click', () => {
          if (this.onCharacterClick) this.onCharacterClick(char);
        });

      // Portrait: colored circle with initial
      g.append('circle').attr('r', 24)
        .attr('fill', char.color).attr('fill-opacity', 0.12);
      g.append('circle').attr('r', 24)
        .attr('fill', 'none')
        .attr('stroke', char.color).attr('stroke-width', 2).attr('stroke-opacity', 0.8);

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-family', "'Noto Serif SC', serif")
        .attr('font-size', '18px').attr('font-weight', '700')
        .attr('fill', char.color)
        .text(char.name.charAt(0));

      // Name
      g.append('text')
        .attr('class', 'char-start-name')
        .attr('y', 42).attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', char.color).attr('fill-opacity', 0.9)
        .text(char.name);

      // Birth-death years
      g.append('text')
        .attr('y', 56).attr('text-anchor', 'middle')
        .attr('font-family', "'SF Mono', monospace")
        .attr('font-size', '9px')
        .attr('fill', char.color).attr('fill-opacity', 0.4)
        .text(`${char.birth}-${char.death}`);

      // Hover
      g.on('mouseenter', function () {
        d3.select(this).selectAll('circle')
          .transition().duration(200).attr('r', 28);
      }).on('mouseleave', function () {
        d3.select(this).selectAll('circle')
          .transition().duration(200).attr('r', 24);
      });
    });
  }

  _renderEventNodes() {
    this.nodeGroup.selectAll('*').remove();

    const eventList = this.activeEvents
      .map((id) => this.events[id])
      .filter(Boolean);

    eventList.forEach((event) => {
      const x = this.xScale(event.year);
      const charYs = event.characters
        .filter((cid) => this.activeCharacters.includes(cid))
        .map((cid) => this.yScale(cid))
        .filter((y) => y !== undefined);

      if (charYs.length === 0) return;

      const minY = Math.min(...charYs);
      const maxY = Math.max(...charYs);
      const centerY = (minY + maxY) / 2;
      const isMajor = event.importance === 'major';
      const nodeRadius = isMajor ? 8 : 6;

      // Connector lines (subtle since lines now converge)
      if (charYs.length > 1) {
        this.nodeGroup.append('line')
          .attr('class', 'node-connector')
          .attr('x1', x).attr('y1', minY)
          .attr('x2', x).attr('y2', maxY)
          .attr('stroke', 'rgba(212,168,83,0.15)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,4');
      }

      // Event node group
      const g = this.nodeGroup.append('g')
        .attr('class', 'event-node')
        .attr('data-event', event.id)
        .attr('transform', `translate(${x}, ${centerY})`)
        .attr('cursor', 'pointer')
        .on('click', () => {
          if (this.onEventClick) this.onEventClick(event);
        });

      // Pulse ring (major)
      if (isMajor) {
        g.append('circle').attr('class', 'node-pulse')
          .attr('r', nodeRadius).attr('stroke', '#d4a853').attr('fill', 'none');
      }

      // Outer ring
      g.append('circle').attr('class', 'node-ring')
        .attr('r', nodeRadius + 4).attr('stroke', '#d4a853');

      // Core
      g.append('circle').attr('class', 'node-core')
        .attr('r', nodeRadius).attr('fill', '#d4a853');

      // Event label
      g.append('text').attr('class', 'node-label')
        .attr('y', -(nodeRadius + 14))
        .text(event.name);

      // Year
      g.append('text').attr('class', 'node-label')
        .attr('y', nodeRadius + 22)
        .attr('font-size', '10px')
        .attr('fill', 'rgba(212,168,83,0.5)')
        .text(event.year);

      // Hover
      g.on('mouseenter', function () {
        d3.select(this).select('.node-core')
          .transition().duration(200).attr('r', nodeRadius + 3);
        d3.select(this).select('.node-ring')
          .transition().duration(200).attr('r', nodeRadius + 8).attr('stroke-opacity', 0.8);
        d3.select(this).select('.node-label')
          .transition().duration(200).attr('fill', '#f5f0e8');
      }).on('mouseleave', function () {
        d3.select(this).select('.node-core')
          .transition().duration(200).attr('r', nodeRadius);
        d3.select(this).select('.node-ring')
          .transition().duration(200).attr('r', nodeRadius + 4).attr('stroke-opacity', 0.5);
        d3.select(this).select('.node-label')
          .transition().duration(200).attr('fill', 'rgba(168,158,142,1)');
      });
    });
  }

  // ── Highlighting ───────────────────────────────────

  _highlightCharacter(charId) {
    this.highlightedCharacter = charId;

    this.lineGroup.selectAll('.character-line')
      .transition().duration(300)
      .attr('stroke-opacity', function () {
        return d3.select(this).attr('data-character') === charId ? 1 : 0.1;
      });
    // Show personal event labels for highlighted character
    this.personalGroup.selectAll('.personal-event')
      .transition().duration(300)
      .attr('opacity', function () {
        return d3.select(this).attr('data-character') === charId ? 1 : 0.15;
      });
    this.personalGroup.selectAll('.personal-event')
      .filter(function () { return d3.select(this).attr('data-character') === charId; })
      .selectAll('.personal-label')
      .transition().duration(300)
      .attr('fill-opacity', 0.8);
  }

  _unhighlightCharacter() {
    this.highlightedCharacter = null;

    this.lineGroup.selectAll('.character-line')
      .transition().duration(300).attr('stroke-opacity', 0.7);
    this.personalGroup.selectAll('.personal-event')
      .transition().duration(300).attr('opacity', 1);
    if (!this.biographyCharacter) {
      this.personalGroup.selectAll('.personal-label')
        .transition().duration(300).attr('fill-opacity', 0);
    }
  }

  // ── Zoom ───────────────────────────────────────────

  _setupZoom() {
    this._zoomEndTimer = null;
    this.zoomBehavior = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        this.currentTransform = event.transform;
        const { x, y, k } = event.transform;
        this.mainGroup.style('transform', `translate(${x}px, ${y}px) scale(${k})`);
        this.mainGroup.style('transform-origin', '0 0');

        // Add .zooming class for reduced rendering quality during active zoom
        this.svg.classed('zooming', true);
        clearTimeout(this._zoomEndTimer);
        this._zoomEndTimer = setTimeout(() => {
          this.svg.classed('zooming', false);
        }, 150);
        if (this.onZoomChange) this.onZoomChange(event.transform);
      });

    this.svg.call(this.zoomBehavior);
    this._fitView(false);
  }

  _fitView(animate = false) {
    const scale = Math.min(
      this.width / this.innerWidth,
      this.height / this.innerHeight
    ) * 0.92;

    const transform = d3.zoomIdentity
      .translate(
        (this.width - this.innerWidth * scale) / 2,
        (this.height - this.innerHeight * scale) / 2
      )
      .scale(scale);

    if (animate) {
      this.svg.transition().duration(800).ease(d3.easeCubicInOut)
        .call(this.zoomBehavior.transform, transform);
    } else {
      this.svg.call(this.zoomBehavior.transform, transform);
    }
  }

  zoomToEvent(eventId) {
    const event = this.events[eventId];
    if (!event) return;

    const x = this.xScale(event.year);
    const charYs = event.characters
      .filter((cid) => this.activeCharacters.includes(cid))
      .map((cid) => this.yScale(cid))
      .filter((y) => y !== undefined);
    const centerY = charYs.length
      ? (Math.min(...charYs) + Math.max(...charYs)) / 2
      : this.height / 2;

    const scale = 1.5;
    const transform = d3.zoomIdentity
      .translate(this.width / 2 - x * scale, this.height / 2 - centerY * scale)
      .scale(scale);

    this.svg.transition().duration(1000).ease(d3.easeCubicInOut)
      .call(this.zoomBehavior.transform, transform);
  }

  resetZoom() { this._fitView(true); }

  followCharacter(charId) {
    if (charId) this._highlightCharacter(charId);
    else this._unhighlightCharacter();
  }

  getTransform() { return this.currentTransform; }

  getDimensions() {
    return {
      width: this.width, height: this.height,
      innerWidth: this.innerWidth, innerHeight: this.innerHeight,
    };
  }
}
