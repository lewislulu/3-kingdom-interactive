# 三国演义时空交汇系统

Interactive web system for exploring the full storyline of **Romance of the Three Kingdoms** with character destiny lines, event nodes, evidence references, and searchable excerpts.

## What This Project Does

- Renders a multi-character storyline canvas (chapter-based timeline).
- Shows event details in a right-side drawer (Background / Process / Result).
- Shows dialogue excerpts with expand/collapse.
- Shows evidence references with expand/collapse full text.
- Supports event discovery via search (character / event / quote).
- Uses an offline pipeline to build structured data from source text (`原著.txt`).

## Current Coverage

- Chapters: `1-120`
- Periods: `5` (乱世狂澜 -> 星落五丈原)
- Epilogue: 晋统一链路 included
- Dataset location: `data/sgyy_full`

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript
- Timeline rendering/layout: D3 utilities + SVG
- Motion: Framer Motion
- Search: MiniSearch
- Shared schemas: Zod (`@sgyy/schema`)
- Pipeline: Python scripts
- Tests: Vitest + Playwright

## Quick Start

Requirements:
- Node.js 18+
- npm
- Python 3

Install:

```bash
npm install
```

Run app:

```bash
npm run dev
```

Open:
- [http://localhost:3000](http://localhost:3000)

## Useful Commands

```bash
# Build web app
npm run build

# Unit/contract tests
npm run test

# E2E tests
npm run test:e2e

# Rebuild full dataset from source text
npm run pipeline:build

# Validate full dataset integrity
npm run pipeline:validate
```

## Data Pipeline

Main scripts:
- `pipeline/offline_ai/build_full_dataset.py`
- `pipeline/offline_ai/validate_full_dataset.py`

Input text priority:
1. `data/原著.txt`

Generated files:
- `periods.json`
- `chapters.json`
- `characters.json`
- `events.json`
- `dialogues.json`
- `evidence.json`
- `coverage.json`
- `epilogue.json`
- `dataset.json`

All under:
- `data/sgyy_full`

## API (v2)

- `GET /api/v2/periods`
- `GET /api/v2/chapters?period_id=&from=&to=`
- `GET /api/v2/characters?period_id=&camp=`
- `GET /api/v2/events?period_id=&chapter=&character_id=&q=&cursor=`
- `GET /api/v2/events/:id`
- `GET /api/v2/dialogues?event_id=`
- `GET /api/v2/evidence/:id`
- `GET /api/v2/coverage?chapter=`
- `GET /api/v2/epilogue`
- `GET /api/v2/search?q=&scope=character,event,quote`

## Project Structure

- `apps/web` - Next.js app + UI + API routes
- `packages/schema` - shared types and Zod schemas
- `pipeline/offline_ai` - offline extraction/build/validation
- `data` - generated datasets
- `tests` - test suites

## Notes

- `IDEA.md` and `sample.html` are intentionally ignored by git.
- Timeline now uses lane-start avatar badges (name + circular avatar) instead of a left character list.
