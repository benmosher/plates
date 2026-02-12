# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plate Math — a weight plate calculator for lifters. Determines which plates to load on a bar/dumbbell to reach a target weight. Deployed to GitHub Pages at https://benmosher.github.io/plates/.

## Commands

- `pnpm install` — install dependencies
- `pnpm start` — dev server (Vite, http://localhost:5173)
- `pnpm test` — run tests (Vitest, single run)
- `pnpm build` — production build to `./build`

CI runs `pnpm test` then `pnpm build --base="/plates/"` on push to main.

## Architecture

**Stack:** React 19 + TypeScript (strict) + Vite + React Router + Pico CSS (CDN)

### Routing (`App.tsx`)

Three routes: `/` (calculator), `/mass` (plate/bar config), `/maxes` (1RM editor). All wrapped in `AppContextProvider`.

### State Management (`context.tsx`)

App-level state (target weight, bar type, percentage, 1RM base) managed via `useReducer` + React Context. State persists to localStorage immediately and to URL hash (debounced 1s). URL hash is the shareable format (`#weight=225&bar=barbell&1rm=355`). Browser back/forward triggers popstate listener to restore state.

### Data Layer (`plate-db.ts`)

IndexedDB (database name: `"mass"`, version 4) with three stores: `plates`, `bars`, `maxes`. In-memory Maps (`PLATE_MAP`, `BAR_MAP`, `MAX_MAP`) mirror DB state. React integration via `useSyncExternalStore` with a manual subscription system. The `useMassStorage()` hook triggers Suspense while DB initializes, then returns sorted arrays + mutation functions.

### Core Math (`plate-math.ts`)

- `determinePlates` — greedy algorithm, heaviest-first, respects bar's `plateThreshold`
- `determinePlateCombos` — generates all possible plate load combinations via sorted-array merging
- `determineWeightSpace` — all achievable weights across bars, respects `maxLoad`
- `chooseBar` — selects heaviest bar ≤ target, filtered by type
- `closestTarget` — binary search for nearest valid weight

Tests live in `plate-math.test.ts` and cover the math functions.

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
