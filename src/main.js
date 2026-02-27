/**
 * Main entry point -- Storyline Visualization Template
 *
 * Cinematic dark theme, D3 storyline engine,
 * GSAP animations, Markdown narrative renderer.
 * Chapter-based navigation, personal events, biography mode.
 */
import { loadAllData } from './data/loader.js';
import { Timeline } from './core/timeline.js';
import { Router } from './core/router.js';
import { Minimap } from './core/minimap.js';
import { ChapterBar } from './ui/chapter-bar.js';
import { CharacterCard } from './ui/character-card.js';
import { EventPanel } from './ui/event-panel.js';
import { DetailView } from './ui/detail-view.js';
import { PersonalTooltip } from './ui/personal-tooltip.js';
import { Legend } from './ui/legend.js';
import { Feedback } from './ui/feedback.js';
import { ParticleSystem } from './ui/particles.js';
import gsap from 'gsap';

// ─── Boot ──────────────────────────────────────────────

async function boot() {
  const header = document.getElementById('header');

  try {
    // Load all data
    const data = await loadAllData();

    // ── Initialize systems ──

    // 1. Router (URL state management)
    const router = new Router();

    // 2. Particle background
    const particles = new ParticleSystem('bg-particles');
    particles.start(50);

    // 3. Timeline engine
    const svgElement = document.getElementById('timeline-svg');
    const timeline = new Timeline(svgElement, data);

    // 4. Minimap
    const minimap = new Minimap(timeline);
    timeline.onZoomChange = (transform) => minimap.update(transform);

    // 5. Chapter bar
    const chapterData = (data.timeline.chapters || []).map((ch) => ({
      id: ch.id,
      title: ch.title,
      subtitle: ch.subtitle,
      startYear: ch.timeRange[0],
      endYear: ch.timeRange[1],
    }));

    const chapterBar = new ChapterBar(chapterData, (chapterId) => {
      timeline.setChapter(chapterId);
      chapterBar.setActive(chapterId);
      router.setState({ chapter: chapterId, event: null, bio: null });
      hideBioBanner();
    });

    const chapterMount = document.getElementById('chapter-bar-mount');
    chapterMount.appendChild(chapterBar.getElement());
    chapterBar.setActive(null);

    // 6. Character card
    const characterCard = new CharacterCard();

    // 7. Event panel
    const eventPanel = new EventPanel(data.characters, data.events);

    // 8. Detail view
    const detailView = new DetailView(data.characters);

    // 9. Personal tooltip
    const personalTooltip = new PersonalTooltip();

    // 10. Legend
    const legend = new Legend();
    document.getElementById('app').appendChild(legend.getElement());

    // 11. Feedback (GitHub issue submission)
    const feedback = new Feedback();
    document.getElementById('app').appendChild(feedback.getButton());
    document.getElementById('app').appendChild(feedback.getOverlay());

    // ── Biography mode banner ──
    const bioBanner = document.getElementById('bio-banner');
    const bioBannerText = bioBanner.querySelector('.bio-banner-text');
    const bioBannerExit = bioBanner.querySelector('.bio-banner-exit');

    function showBioBanner(charId) {
      const char = data.characters[charId];
      if (!char) return;
      bioBannerText.textContent = `${char.name} -- 人物传记模式`;
      bioBannerText.style.color = char.color;
      bioBanner.classList.remove('hidden');
      gsap.from(bioBanner, { y: -40, opacity: 0, duration: 0.5, ease: 'power2.out' });
    }

    function hideBioBanner() {
      bioBanner.classList.add('hidden');
    }

    // ── Wire up interactions ──

    timeline.onCharacterClick = (character) => {
      eventPanel.hide();
      characterCard.show(character);
    };

    characterCard.onFollow = (charId) => {
      timeline.followCharacter(charId);
      const unfollowHandler = () => {
        timeline.followCharacter(null);
        document.removeEventListener('click', unfollowHandler);
      };
      setTimeout(() => {
        document.addEventListener('click', unfollowHandler);
      }, 100);
    };

    characterCard.onBiographyMode = (charId) => {
      timeline.setBiographyMode(charId);
      showBioBanner(charId);
      router.setState({ bio: charId, event: null });
    };

    bioBannerExit.addEventListener('click', () => {
      timeline.setBiographyMode(null);
      hideBioBanner();
      router.setState({ bio: null });
    });

    timeline.onEventClick = (event) => {
      characterCard.hide();
      timeline.zoomToEvent(event.id);
      setTimeout(() => {
        eventPanel.show(event);
      }, 400);
      router.setState({ event: event.id });
    };

    eventPanel.onSceneClick = (scene, event) => {
      detailView.show(scene, event);
    };

    eventPanel.onRelatedEventClick = (relatedEvent) => {
      eventPanel.hide();
      setTimeout(() => {
        timeline.zoomToEvent(relatedEvent.id);
        setTimeout(() => {
          eventPanel.show(relatedEvent);
          router.setState({ event: relatedEvent.id });
        }, 400);
      }, 300);
    };

    timeline.onPersonalEventHover = (pe, char, position) => {
      personalTooltip.show(pe, char, position);
    };
    timeline.onPersonalEventLeave = () => {
      personalTooltip.hide();
    };

    timeline.onChapterChange = (chapterId) => {
      chapterBar.setActive(chapterId);
    };

    // ── Router: restore state from URL ──
    const initialState = router.getState();
    if (initialState.chapter) {
      timeline.setChapter(initialState.chapter);
      chapterBar.setActive(initialState.chapter);
    }
    if (initialState.bio) {
      timeline.setBiographyMode(initialState.bio);
      showBioBanner(initialState.bio);
    }
    if (initialState.event && data.events[initialState.event]) {
      setTimeout(() => {
        timeline.zoomToEvent(initialState.event);
        setTimeout(() => eventPanel.show(data.events[initialState.event]), 500);
      }, 800);
    }

    router.onChange((state) => {
      if (state.chapter !== timeline.getCurrentChapter()) {
        timeline.setChapter(state.chapter);
        chapterBar.setActive(state.chapter);
      }
      if (state.bio) {
        timeline.setBiographyMode(state.bio);
        showBioBanner(state.bio);
      } else if (timeline.biographyCharacter) {
        timeline.setBiographyMode(null);
        hideBioBanner();
      }
    });

    // ── Keyboard shortcuts ──
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (detailView.isVisible) {
          detailView.hide();
        } else if (eventPanel.isVisible) {
          eventPanel.hide();
        } else if (characterCard.isVisible) {
          characterCard.hide();
        } else if (timeline.biographyCharacter) {
          timeline.setBiographyMode(null);
          hideBioBanner();
          router.setState({ bio: null });
        }
      }
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        if (!eventPanel.isVisible && !characterCard.isVisible && !detailView.isVisible) {
          timeline.resetZoom();
        }
      }
    });

    // ── Entrance animation ──
    gsap.from(header, { y: -40, opacity: 0, duration: 1, ease: 'power3.out' });
    gsap.from('#chapter-bar-mount', { y: -60, opacity: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' });
    gsap.from('#timeline-container', { opacity: 0, duration: 1.5, delay: 0.3, ease: 'power2.out' });
    gsap.from('#minimap', { y: 20, opacity: 0, duration: 0.8, delay: 0.8, ease: 'power2.out' });

    console.log('三国演义可视化已加载');
    console.log(`  ${Object.keys(data.characters).length} 位人物`);
    console.log(`  ${Object.keys(data.events).length} 个事件`);
    console.log(`  ${(data.timeline.chapters || []).length} 卷`);
    console.log('  按 R 重置缩放。点击头像查看人物传记。点击节点查看事件详情。');

  } catch (err) {
    console.error('Failed to load visualization:', err);
  }
}

// ─── Start ──────────────────────────────────────────────

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
