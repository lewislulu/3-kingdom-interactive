/**
 * MapEngine - D3 geo-based Three Kingdoms interactive map (v2)
 *
 * Improvements over v1:
 *  1. Province-based territory polygons (not rectangles)
 *  2. Character clustering when multiple at same location
 *  3. Zoom-based progressive disclosure (detail on zoom-in)
 *  4. Minimized labels by default, show on hover
 */
import * as d3 from 'd3';

// ═══ Color palette — each layer has its own hue ═══
const COLORS = {
  capital:       { fill: '#ffd700',              stroke: '#ffd700',              label: '#ffd700',              glow: 'rgba(255, 215, 0, 0.25)' },
  city:          { fill: 'rgba(184, 168, 152, 0.6)', stroke: 'rgba(184, 168, 152, 0.4)', label: 'rgba(200, 192, 180, 0.85)' },
  battlefield:   { fill: 'rgba(192, 57, 43, 0.7)',   stroke: '#c0392b',              label: '#e07060' },
  landmark:      { fill: 'rgba(126, 200, 184, 0.7)', stroke: '#7ec8b8',              label: '#7ec8b8' },
  eventMajor:    { fill: '#ff8c42',              stroke: '#ff8c42',              label: '#ff8c42',              pulse: '#ff8c42' },
  eventMinor:    { fill: 'rgba(212, 145, 94, 0.6)',  stroke: '#d4915e',              label: '#d4915e' },
  province:      { fill: 'rgba(26, 26, 36, 0.6)',    stroke: 'rgba(160, 160, 180, 0.08)' },
  cluster:       { fill: 'rgba(139, 187, 208, 0.2)', stroke: 'rgba(139, 187, 208, 0.6)', text: '#8bbbd0' },
};

export class MapEngine {
  constructor(container, data) {
    this.container = container;
    this.data = data;
    this.mapData = data.mapData;
    this.characters = data.characters;
    this.events = data.events;
    this.timeline = data.timeline;

    this.currentChapter = 1;
    this.currentZoomScale = 1;

    this._buildLocationIndex();

    this.svg = null;
    this.g = null;
    this.projection = null;
    this.path = null;
    this.zoom = null;

    // Callbacks
    this.onEventClick = null;
    this.onCharacterClick = null;
    this.onLocationClick = null;

    // Layer refs
    this.provincePathMap = {};
    this.territoryElements = [];
    this.eventMarkers = [];
    this.characterMarkers = [];
    this.clusterGroups = {};

    this._init();
  }

  _buildLocationIndex() {
    this.locationMap = {};
    const locations = this.mapData.locations?.locations || [];
    for (const loc of locations) {
      this.locationMap[loc.id] = loc;
    }
  }

  _init() {
    const rect = this.container.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    this._width = width;
    this._height = height;

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('class', 'map-svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block');

    this.g = this.svg.append('g').attr('class', 'map-main-group');

    this.projection = d3.geoMercator()
      .center([110, 33])
      .scale(Math.min(width, height) * 2.2)
      .translate([width / 2, height / 2]);

    this.path = d3.geoPath().projection(this.projection);

    // Zoom with scale tracking for progressive disclosure
    this.zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
        const newScale = event.transform.k;
        if (Math.abs(newScale - this.currentZoomScale) > 0.3) {
          this.currentZoomScale = newScale;
          this._updateVisibilityForZoom();
        }
      });
    this.svg.call(this.zoom);

    // Render layers
    this._renderProvinces();
    this._renderRivers();
    this._renderCities();
    this._renderEvents();
    this._renderCharacters();

    this.setChapter(1);

    // Auto-resize when container size changes
    this._resizeObserver = new ResizeObserver(() => {
      const r = this.container.getBoundingClientRect();
      const newW = Math.round(r.width);
      const newH = Math.round(r.height);
      if (newW && newH && (newW !== this._width || newH !== this._height)) {
        this.resize();
      }
    });
    this._resizeObserver.observe(this.container);
  }

  // ═══ LAYER 1: Province outlines + territory coloring ═══
  _renderProvinces() {
    const geoData = this.mapData['china-geo'];
    if (!geoData) return;

    this.provinceGroup = this.g.append('g').attr('class', 'map-provinces');

    this.provinceGroup.selectAll('path')
      .data(geoData.features)
      .join('path')
      .attr('d', this.path)
      .attr('class', 'map-province')
      .attr('fill', COLORS.province.fill)
      .attr('stroke', COLORS.province.stroke)
      .attr('stroke-width', 0.5)
      .each((d, i, nodes) => {
        // Store ref for territory coloring
        const name = d.properties.name;
        this.provincePathMap[name] = d3.select(nodes[i]);
      });

    // Territory labels group (rendered on top of provinces)
    this.territoryLabelGroup = this.g.append('g').attr('class', 'map-territory-labels');
  }

  // ═══ LAYER 2: Rivers ═══
  _renderRivers() {
    const rivers = this.mapData.rivers?.rivers;
    if (!rivers) return;

    const riverGroup = this.g.append('g').attr('class', 'map-rivers');

    for (const river of rivers) {
      const line = d3.line()
        .x(d => this.projection(d)[0])
        .y(d => this.projection(d)[1])
        .curve(d3.curveCatmullRom.alpha(0.5));

      riverGroup.append('path')
        .attr('d', line(river.coords))
        .attr('fill', 'none')
        .attr('stroke', river.color)
        .attr('stroke-width', river.width)
        .attr('stroke-linecap', 'round');

      // River name - only visible at medium+ zoom
      const mid = river.coords[Math.floor(river.coords.length / 2)];
      const midPt = this.projection(mid);
      if (midPt) {
        riverGroup.append('text')
          .attr('class', 'map-detail-label')
          .attr('x', midPt[0])
          .attr('y', midPt[1] - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', river.color)
          .attr('font-size', 9)
          .attr('letter-spacing', 2)
          .attr('opacity', 0)
          .text(river.name);
      }
    }
  }

  // ═══ LAYER 3: City markers (zoom-aware) ═══
  _renderCities() {
    const locations = this.mapData.locations?.locations || [];
    if (!locations.length) return;

    this.cityGroup = this.g.append('g').attr('class', 'map-cities');
    this.cityElements = [];

    for (const loc of locations) {
      const pt = this.projection(loc.coords);
      if (!pt) continue;

      const isCapital = loc.type === 'capital';
      const isBattlefield = loc.type === 'battlefield';
      const isLandmark = loc.type === 'landmark';
      const typeKey = isCapital ? 'capital' : isBattlefield ? 'battlefield' : isLandmark ? 'landmark' : 'city';
      const palette = COLORS[typeKey];
      const r = isCapital ? 5 : isBattlefield ? 3 : 3.5;

      const group = this.cityGroup.append('g')
        .attr('class', `city-marker city-${loc.type}`)
        .attr('transform', `translate(${pt[0]}, ${pt[1]})`)
        .style('cursor', 'pointer');

      // Hit area (invisible, always present)
      group.append('circle')
        .attr('r', 12)
        .attr('fill', 'transparent')
        .attr('class', 'city-hitarea');

      // Marker shape
      if (isBattlefield) {
        const s = r;
        group.append('path')
          .attr('d', `M0,-${s} L${s},0 L0,${s} L-${s},0 Z`)
          .attr('fill', palette.fill)
          .attr('stroke', palette.stroke)
          .attr('stroke-width', 1);
      } else {
        // Glow ring for capitals
        if (isCapital) {
          group.append('circle')
            .attr('r', r + 3)
            .attr('fill', 'none')
            .attr('stroke', COLORS.capital.glow)
            .attr('stroke-width', 1);
        }
        group.append('circle')
          .attr('r', r)
          .attr('fill', isCapital ? palette.fill : palette.fill)
          .attr('stroke', palette.stroke)
          .attr('stroke-width', isCapital ? 1.5 : 1);
      }

      // City name label - hidden by default for non-capitals
      const label = group.append('text')
        .attr('class', isCapital ? 'city-label-capital' : 'city-label-detail')
        .attr('x', 0)
        .attr('y', -(r + 5))
        .attr('text-anchor', 'middle')
        .attr('fill', palette.label)
        .attr('font-size', isCapital ? 11 : 9)
        .attr('font-weight', isCapital ? 700 : 400)
        .attr('opacity', isCapital ? 1 : 0)
        .text(loc.name);

      // Hover: show label + description tooltip
      group.on('mouseenter', () => {
        label.attr('opacity', 1);
        group.select('circle:not(.city-hitarea)').attr('r', r + 1.5);
      });
      group.on('mouseleave', () => {
        if (!isCapital && this.currentZoomScale < 2.5) {
          label.attr('opacity', 0);
        }
        group.select('circle:not(.city-hitarea)').attr('r', r);
      });

      group.on('click', () => {
        if (this.onLocationClick) this.onLocationClick(loc);
      });

      group.append('title').text(`${loc.name} — ${loc.description}`);

      this.cityElements.push({ loc, group, label, isCapital });
    }
  }

  // ═══ LAYER 4: Event markers (shown per chapter, labels hidden by default) ═══
  _renderEvents() {
    this.eventGroup = this.g.append('g').attr('class', 'map-events');
    this.eventMarkers = [];

    const allEvents = Object.values(this.events);
    for (const evt of allEvents) {
      if (!evt.location) continue;
      const loc = this.locationMap[evt.location];
      if (!loc) continue;

      const pt = this.projection(loc.coords);
      if (!pt) continue;

      const isMajor = evt.importance === 'major';
      const evtPalette = isMajor ? COLORS.eventMajor : COLORS.eventMinor;
      const group = this.eventGroup.append('g')
        .attr('class', 'map-event-marker')
        .attr('transform', `translate(${pt[0]}, ${pt[1]})`)
        .attr('opacity', 0)
        .style('cursor', 'pointer')
        .style('pointer-events', 'none');

      // Pulse ring for major events
      if (isMajor) {
        group.append('circle')
          .attr('class', 'event-pulse-ring')
          .attr('r', 8)
          .attr('fill', 'none')
          .attr('stroke', COLORS.eventMajor.pulse)
          .attr('stroke-width', 1)
          .attr('opacity', 0);
      }

      // Event dot
      group.append('circle')
        .attr('r', isMajor ? 4.5 : 3)
        .attr('fill', evtPalette.fill)
        .attr('stroke', evtPalette.stroke)
        .attr('stroke-width', 0.8);

      // Event name label - hidden by default, show on hover or zoom
      const eventLabel = group.append('text')
        .attr('class', 'event-name-label')
        .attr('x', 7)
        .attr('y', 3)
        .attr('fill', evtPalette.label)
        .attr('font-size', isMajor ? 10 : 8)
        .attr('font-weight', isMajor ? 700 : 400)
        .attr('opacity', 0)
        .text(evt.name);

      // Hover: show label
      group.on('mouseenter', () => { eventLabel.attr('opacity', 1); });
      group.on('mouseleave', () => {
        if (this.currentZoomScale < 3) eventLabel.attr('opacity', 0);
      });

      group.on('click', () => {
        if (this.onEventClick) this.onEventClick(evt);
      });

      group.append('title').text(`第${evt.year}回 — ${evt.name}`);

      this.eventMarkers.push({
        year: evt.year,
        element: group,
        event: evt,
        label: eventLabel,
        isMajor,
      });
    }
  }

  // ═══ LAYER 5: Character clusters ═══
  _renderCharacters() {
    this.characterGroup = this.g.append('g').attr('class', 'map-characters');
    this.characterMarkers = [];

    const charLocations = this.mapData['character-locations']?.characterLocations || [];

    for (const charLoc of charLocations) {
      const char = this.characters[charLoc.id];
      if (!char) continue;

      // Individual avatar (small, used when few at location)
      const group = this.characterGroup.append('g')
        .attr('class', `map-char-avatar map-char-${charLoc.id}`)
        .attr('opacity', 0)
        .style('cursor', 'pointer')
        .style('pointer-events', 'none');

      const r = 10;
      group.append('circle')
        .attr('r', r)
        .attr('fill', char.color)
        .attr('opacity', 0.25)
        .attr('stroke', char.color)
        .attr('stroke-width', 1.5);

      // Character initial
      group.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#fff')
        .attr('font-size', 10)
        .attr('font-weight', 700)
        .text(char.name.charAt(0));

      // Name label - hidden by default
      const nameLabel = group.append('text')
        .attr('class', 'char-name-label')
        .attr('y', r + 12)
        .attr('text-anchor', 'middle')
        .attr('fill', char.color)
        .attr('font-size', 8)
        .attr('font-weight', 600)
        .attr('opacity', 0)
        .text(char.name);

      group.on('mouseenter', () => { nameLabel.attr('opacity', 1); });
      group.on('mouseleave', () => {
        if (this.currentZoomScale < 3) nameLabel.attr('opacity', 0);
      });
      group.on('click', () => {
        if (this.onCharacterClick) this.onCharacterClick(char);
      });

      group.append('title').text(char.name);

      this.characterMarkers.push({
        id: charLoc.id,
        movements: charLoc.movements,
        element: group,
        char,
        nameLabel,
      });
    }

    // Cluster group for aggregated display
    this.clusterGroup = this.characterGroup.append('g').attr('class', 'map-clusters');
  }

  // ═══ TIME CONTROL ═══
  setChapter(chapter) {
    this.currentChapter = chapter;
    this._updateTerritories();
    this._updateEvents();
    this._updateCharacters();
  }

  _updateTerritories() {
    const ch = this.currentChapter;
    const territories = this.mapData.territories;
    if (!territories) return;

    // Find current period
    const currentPeriod = territories.periods.find(
      p => ch >= p.chapters[0] && ch <= p.chapters[1]
    );

    // Build province -> faction color map
    const provinceColorMap = {};
    if (currentPeriod) {
      for (const terr of currentPeriod.territories) {
        const faction = territories.factions[terr.faction];
        if (!faction || !terr.provinces) continue;
        for (const prov of terr.provinces) {
          provinceColorMap[prov] = faction.color;
        }
      }
    }

    // Color provinces
    for (const [name, pathEl] of Object.entries(this.provincePathMap)) {
      const color = provinceColorMap[name];
      pathEl.transition()
        .duration(600)
        .attr('fill', color ? `${color}18` : COLORS.province.fill)
        .attr('stroke', color ? `${color}40` : COLORS.province.stroke);
    }

    // Update territory labels
    this.territoryLabelGroup.selectAll('*').remove();
    if (currentPeriod) {
      for (const terr of currentPeriod.territories) {
        const faction = territories.factions[terr.faction];
        if (!faction || !terr.center) continue;
        const center = this.projection(terr.center);
        if (!center) continue;

        this.territoryLabelGroup.append('text')
          .attr('x', center[0])
          .attr('y', center[1])
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', faction.color)
          .attr('font-size', 16)
          .attr('font-weight', 900)
          .attr('opacity', 0.5)
          .attr('letter-spacing', 6)
          .style('pointer-events', 'none')
          .text(terr.label);
      }
    }
  }

  _updateEvents() {
    const ch = this.currentChapter;
    const chapterConfig = (this.timeline.chapters || []).find(
      c => ch >= c.timeRange[0] && ch <= c.timeRange[1]
    );
    const range = chapterConfig ? chapterConfig.timeRange : [ch, ch];

    for (const m of this.eventMarkers) {
      const visible = m.year >= range[0] && m.year <= range[1];
      const isCurrent = m.year === ch;
      m.element
        .style('pointer-events', visible ? 'auto' : 'none')
        .transition()
        .duration(400)
        .attr('opacity', visible ? (isCurrent ? 1 : 0.5) : 0);

      // Pulse + show label for current chapter event
      const pulse = m.element.select('.event-pulse-ring');
      if (isCurrent) {
        if (!pulse.empty()) pulse.attr('opacity', 0.6);
        m.label.attr('opacity', 1);
      } else {
        if (!pulse.empty()) pulse.attr('opacity', 0);
        if (this.currentZoomScale < 3) m.label.attr('opacity', 0);
      }
    }
  }

  _updateCharacters() {
    const ch = this.currentChapter;

    // 1. Group active characters by location
    const locationGroups = {};
    const activeMarkers = new Set();

    for (const m of this.characterMarkers) {
      const movement = m.movements.find(
        mv => ch >= mv.chapters[0] && ch <= mv.chapters[1]
      );
      if (!movement) {
        m.element.style('pointer-events', 'none').transition().duration(400).attr('opacity', 0);
        continue;
      }
      const loc = this.locationMap[movement.location];
      if (!loc) {
        m.element.style('pointer-events', 'none').transition().duration(400).attr('opacity', 0);
        continue;
      }

      activeMarkers.add(m.id);
      if (!locationGroups[movement.location]) {
        locationGroups[movement.location] = [];
      }
      locationGroups[movement.location].push(m);
    }

    // 2. Clear old clusters
    this.clusterGroup.selectAll('*').remove();

    // 3. Position: cluster when >3 at same location, else show individuals
    const CLUSTER_THRESHOLD = 3;

    for (const [locId, markers] of Object.entries(locationGroups)) {
      const loc = this.locationMap[locId];
      if (!loc) continue;
      const basePt = this.projection(loc.coords);
      if (!basePt) continue;

      const count = markers.length;
      const baseY = basePt[1] + 18;

      if (count > CLUSTER_THRESHOLD) {
        // Hide individual avatars
        for (const m of markers) {
          m.element.style('pointer-events', 'none').transition().duration(300).attr('opacity', 0);
        }

        // Create cluster bubble
        this._createCluster(basePt[0], baseY, markers, loc);
      } else {
        // Show individuals in a compact row
        const spacing = 22;
        for (let i = 0; i < count; i++) {
          const m = markers[i];
          const offsetX = (i - (count - 1) / 2) * spacing;
          m.element
            .style('pointer-events', 'auto')
            .transition()
            .duration(600)
            .ease(d3.easeCubicInOut)
            .attr('transform', `translate(${basePt[0] + offsetX}, ${baseY})`)
            .attr('opacity', 1);
        }
      }
    }
  }

  _createCluster(x, y, markers, loc) {
    const count = markers.length;
    const self = this;

    const clusterG = this.clusterGroup.append('g')
      .attr('transform', `translate(${x}, ${y})`)
      .style('cursor', 'pointer');

    // Prevent D3 zoom from capturing pointer events on cluster
    clusterG.on('mousedown.zoom touchstart.zoom', (e) => {
      e.stopPropagation();
    });

    // Cluster bubble — larger hit area
    const r = 16;
    clusterG.append('circle')
      .attr('r', r)
      .attr('fill', COLORS.cluster.fill)
      .attr('stroke', COLORS.cluster.stroke)
      .attr('stroke-width', 1.5);

    // Count number
    clusterG.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', COLORS.cluster.text)
      .attr('font-size', 12)
      .attr('font-weight', 700)
      .style('pointer-events', 'none')
      .text(count);

    // "click to expand" hint
    clusterG.append('text')
      .attr('y', r + 12)
      .attr('text-anchor', 'middle')
      .attr('fill', COLORS.cluster.text)
      .attr('font-size', 7)
      .attr('opacity', 0.6)
      .style('pointer-events', 'none')
      .text('点击展开');

    // Expanded state
    let expanded = false;

    clusterG.on('click', (event) => {
      event.stopPropagation();
      if (expanded) {
        expanded = false;
        collapseCluster();
      } else {
        expanded = true;
        expandCluster();
      }
    });

    // Tooltip with character names
    const names = markers.map(m => m.char.name).join('、');
    clusterG.append('title').text(`${loc.name}：${names}`);

    function expandCluster() {
      // Hide the hint
      clusterG.select('text:last-of-type').attr('opacity', 0);

      // Create individual avatars in a ring around the cluster
      const ringR = 32 + count * 4;
      const angleStep = (Math.PI * 2) / count;

      for (let i = 0; i < count; i++) {
        const m = markers[i];
        const angle = angleStep * i - Math.PI / 2;
        const cx = Math.cos(angle) * ringR;
        const cy = Math.sin(angle) * ringR;

        const avatar = clusterG.append('g')
          .attr('class', 'cluster-expanded-avatar')
          .attr('transform', 'translate(0, 0)')
          .attr('opacity', 0)
          .style('cursor', 'pointer');

        // Prevent zoom from capturing avatar clicks too
        avatar.on('mousedown.zoom touchstart.zoom', (e) => {
          e.stopPropagation();
        });

        avatar.append('circle')
          .attr('r', 12)
          .attr('fill', m.char.color)
          .attr('opacity', 0.3)
          .attr('stroke', m.char.color)
          .attr('stroke-width', 1.5);

        avatar.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', '#fff')
          .attr('font-size', 10)
          .attr('font-weight', 700)
          .style('pointer-events', 'none')
          .text(m.char.name.charAt(0));

        avatar.append('text')
          .attr('y', 20)
          .attr('text-anchor', 'middle')
          .attr('fill', m.char.color)
          .attr('font-size', 9)
          .attr('font-weight', 600)
          .style('pointer-events', 'none')
          .text(m.char.name);

        avatar.on('click', (e) => {
          e.stopPropagation();
          if (self.onCharacterClick) self.onCharacterClick(m.char);
        });

        avatar.transition()
          .duration(400)
          .delay(i * 40)
          .ease(d3.easeCubicOut)
          .attr('transform', `translate(${cx}, ${cy})`)
          .attr('opacity', 1);
      }
    }

    function collapseCluster() {
      // Show the hint again
      clusterG.select('text:last-of-type').attr('opacity', 0.6);

      clusterG.selectAll('.cluster-expanded-avatar')
        .transition()
        .duration(300)
        .attr('transform', 'translate(0, 0)')
        .attr('opacity', 0)
        .remove();
    }
  }

  // ═══ ZOOM-BASED PROGRESSIVE DISCLOSURE ═══
  _updateVisibilityForZoom() {
    const scale = this.currentZoomScale;

    // Detail labels (city names for non-capitals, river names)
    const detailOpacity = scale >= 2.5 ? 1 : 0;
    this.g.selectAll('.city-label-detail').attr('opacity', detailOpacity);
    this.g.selectAll('.map-detail-label').attr('opacity', detailOpacity);

    // Event name labels
    const eventLabelOpacity = scale >= 3 ? 1 : 0;
    this.g.selectAll('.event-name-label').attr('opacity', eventLabelOpacity);

    // Character name labels
    const charLabelOpacity = scale >= 3 ? 1 : 0;
    this.g.selectAll('.char-name-label').attr('opacity', charLabelOpacity);

    // Non-capital cities visibility
    const cityDetailVisible = scale >= 1.5;
    this.g.selectAll('.city-city, .city-battlefield, .city-landmark')
      .style('pointer-events', cityDetailVisible ? 'auto' : 'none')
      .transition()
      .duration(200)
      .attr('opacity', cityDetailVisible ? 1 : 0);

    // Capitals always visible
    this.g.selectAll('.city-capital').attr('opacity', 1);
  }

  // ═══ NAVIGATION ═══
  zoomToLocation(locationId, scale = 4) {
    const loc = this.locationMap[locationId];
    if (!loc) return;
    const pt = this.projection(loc.coords);
    if (!pt) return;

    const rect = this.container.getBoundingClientRect();
    const transform = d3.zoomIdentity
      .translate(rect.width / 2, rect.height / 2)
      .scale(scale)
      .translate(-pt[0], -pt[1]);

    this.svg.transition()
      .duration(1000)
      .ease(d3.easeCubicInOut)
      .call(this.zoom.transform, transform);
  }

  zoomToEvent(eventId) {
    const evt = this.events[eventId];
    if (!evt || !evt.location) return;
    this.zoomToLocation(evt.location, 5);
  }

  resetZoom() {
    this.svg.transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .call(this.zoom.transform, d3.zoomIdentity);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;
    this._width = w;
    this._height = h;

    this.svg
      .attr('width', w)
      .attr('height', h);

    this.projection
      .scale(Math.min(w, h) * 2.2)
      .translate([w / 2, h / 2]);
    this.path = d3.geoPath().projection(this.projection);

    this.g.selectAll('*').remove();
    this.provincePathMap = {};
    this.territoryElements = [];
    this.eventMarkers = [];
    this.characterMarkers = [];

    this._renderProvinces();
    this._renderRivers();
    this._renderCities();
    this._renderEvents();
    this._renderCharacters();
    this.setChapter(this.currentChapter);
  }

  destroy() {
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this.svg) this.svg.remove();
  }
}
