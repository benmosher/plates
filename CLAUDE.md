# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plate Math — a weight plate calculator for lifters. Determines which plates to load on a bar/dumbbell to reach a target weight. Deployed to GitHub Pages at https://benmosher.github.io/plates/.

## Commands

- `pnpm install` — install dependencies
- `pnpm start` — dev server (Vite, http://localhost:5173)
- `pnpm test` — run tests (Vitest, single run)
- `npx vitest run --coverage` — run tests with coverage report
- `pnpm build` — production build to `./build`

CI runs `pnpm test` then `pnpm build --base="/plates/"` on push to main.

## Architecture

**Stack:** React 19 + TypeScript (strict) + Vite + React Router + Pico CSS (CDN)

### Routing (`App.tsx`)

Seven routes, all wrapped in `AppContextProvider`:
- `/` — calculator
- `/mass` — plate/bar config
- `/maxes` — 1RM editor
- `/workouts` — workout list
- `/workouts/import` — import workout from external format
- `/workouts/:id/edit` — workout editor
- `/workouts/:id/view` — workout viewer

### State Management (`context.tsx`)

App-level state (target weight, bar type, percentage, 1RM base) managed via `useReducer` + React Context. State persists to localStorage immediately and to URL hash (debounced 1s). URL hash is the shareable format (`#weight=225&bar=barbell&1rm=355`). Browser back/forward triggers popstate listener to restore state.

### Data Layer (`plate-db.ts`)

Two IndexedDB databases:
- `"mass"` (version 4) — three stores: `plates`, `bars`, `maxes`
- `"workouts"` (version 1) — one store: `workouts`

In-memory Maps (`PLATE_MAP`, `BAR_MAP`, `MAX_MAP`, `WORKOUT_MAP`) mirror DB state. React integration via `useSyncExternalStore` with a manual subscription system. The `useMassStorage()` hook triggers Suspense while DBs initialize, then returns sorted arrays + mutation functions for all four data types.

Workout data shape is defined in `workout-types.ts`: `Workout` → `MovementGroup[]` → `Movement[]` → `WorkoutSet[]`. Migration logic in `plate-db.ts` handles old formats on load.

### Core Math (`plate-math.ts`)

- `determinePlates` — greedy algorithm, heaviest-first, respects bar's `plateThreshold`
- `determinePlateCombos` — generates all possible plate load combinations via sorted-array merging
- `determineWeightSpace` — all achievable weights across bars, respects `maxLoad`
- `chooseBar` — selects heaviest bar ≤ target, filtered by type
- `closestTarget` — binary search for nearest valid weight

Tests live in `plate-math.test.ts` (math functions), `workout-export.test.ts` (workout export logic), and `utils.test.ts` (utility functions). Coverage is enforced at 100% (statements, branches, functions, lines) for `plate-math.ts`, `workout-export.ts`, and `utils.ts` via `@vitest/coverage-v8`. When modifying these files or adding new pure-logic modules, maintain 100% coverage and add the new file to the `include` list in `vite.config.ts`.

### UI Patterns

- `@react-spring/web` for animations (plate stacking in `BarView`, swipe-to-delete in `HiddenDeleteFieldset`)
- `@use-gesture/react` for drag interactions
- `useDeferredValue` on target weight for non-blocking UI updates
- Suspense boundaries around IndexedDB-dependent components, with initial data as fallback

## Code Style

- 2-space indentation, LF line endings (see `.editorconfig`)
- TypeScript strict mode with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
- No ESLint or Prettier config — relies on TypeScript compiler checks
- Imports use `baseUrl: "src"` (bare imports relative to src/)
