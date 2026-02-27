/**
 * MapScrubber - Timeline scrubber for the map view
 *
 * A horizontal slider showing chapters 1-120 with era labels,
 * play/pause button, and current chapter indicator.
 */
export class MapScrubber {
  constructor(timelineData, onChange) {
    this.timeline = timelineData;
    this.onChange = onChange;
    this.currentChapter = 1;
    this.playing = false;
    this.playInterval = null;
    this.playSpeed = 500; // ms per chapter

    this.container = null;
    this._render();
  }

  _render() {
    this.container = document.createElement('div');
    this.container.className = 'map-scrubber';

    // Top row: era labels
    const eraBar = document.createElement('div');
    eraBar.className = 'scrubber-eras';
    const totalChapters = this.timeline.timeRange[1] - this.timeline.timeRange[0] + 1;

    for (const era of (this.timeline.eras || [])) {
      const eraEl = document.createElement('div');
      eraEl.className = 'scrubber-era';
      const width = ((era.end - era.start + 1) / totalChapters) * 100;
      eraEl.style.width = `${width}%`;
      eraEl.textContent = era.name;
      eraEl.title = `第${era.start}回 — 第${era.end}回`;
      eraBar.appendChild(eraEl);
    }
    this.container.appendChild(eraBar);

    // Middle row: slider
    const sliderRow = document.createElement('div');
    sliderRow.className = 'scrubber-slider-row';

    // Play button
    this.playBtn = document.createElement('button');
    this.playBtn.className = 'scrubber-play-btn';
    this.playBtn.innerHTML = '&#9654;'; // play triangle
    this.playBtn.title = '自动播放';
    this.playBtn.addEventListener('click', () => this.togglePlay());
    sliderRow.appendChild(this.playBtn);

    // Slider
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.className = 'scrubber-slider';
    this.slider.min = this.timeline.timeRange[0];
    this.slider.max = this.timeline.timeRange[1];
    this.slider.value = this.currentChapter;
    this.slider.addEventListener('input', (e) => {
      this.setChapter(parseInt(e.target.value), true);
    });
    sliderRow.appendChild(this.slider);

    // Chapter display
    this.chapterDisplay = document.createElement('div');
    this.chapterDisplay.className = 'scrubber-chapter-display';
    this.chapterDisplay.textContent = `第${this.currentChapter}回`;
    sliderRow.appendChild(this.chapterDisplay);

    this.container.appendChild(sliderRow);

    // Bottom row: info text
    this.infoText = document.createElement('div');
    this.infoText.className = 'scrubber-info';
    this.container.appendChild(this.infoText);

    this._updateInfo();
  }

  setChapter(chapter, fromSlider = false) {
    this.currentChapter = chapter;
    if (!fromSlider) {
      this.slider.value = chapter;
    }
    this.chapterDisplay.textContent = `第${chapter}回`;
    this._updateInfo();
    this._updateEraHighlight();
    if (this.onChange) this.onChange(chapter);
  }

  _updateInfo() {
    // Find current chapter config
    const ch = this.currentChapter;
    const chConfig = (this.timeline.chapters || []).find(
      c => ch >= c.timeRange[0] && ch <= c.timeRange[1]
    );
    if (chConfig) {
      this.infoText.textContent = `${chConfig.title} · ${chConfig.subtitle}`;
    }
  }

  _updateEraHighlight() {
    const ch = this.currentChapter;
    const eras = this.container.querySelectorAll('.scrubber-era');
    const eraData = this.timeline.eras || [];
    eras.forEach((el, i) => {
      const era = eraData[i];
      if (era && ch >= era.start && ch <= era.end) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  togglePlay() {
    this.playing = !this.playing;
    if (this.playing) {
      this.playBtn.innerHTML = '&#9646;&#9646;'; // pause
      this.playBtn.title = '暂停';
      this.playInterval = setInterval(() => {
        let next = this.currentChapter + 1;
        if (next > this.timeline.timeRange[1]) {
          next = this.timeline.timeRange[0];
        }
        this.setChapter(next);
      }, this.playSpeed);
    } else {
      this.playBtn.innerHTML = '&#9654;';
      this.playBtn.title = '自动播放';
      clearInterval(this.playInterval);
    }
  }

  getElement() {
    return this.container;
  }

  destroy() {
    if (this.playInterval) clearInterval(this.playInterval);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
