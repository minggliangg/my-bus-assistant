# CLAUDE.md

This file provides guidance to ALL AI agents working on code in this repository (Claude Code, OpenCode, etc.).

## CRITICAL: ALWAYS USE BUN

**NEVER use `npm` commands.** This project uses **Bun** as package manager and runtime.

- Always use `bun` instead of `npm`
- Always use `bun run` or `bunx` instead of `npx`
- Examples:
  - ❌ `npm install` → ✅ `bun install`
  - ❌ `npm run dev` → ✅ `bun dev`
  - ❌ `npx eslint` → ✅ `bunx eslint`
  - ❌ `npm test` → ✅ `bun test`

**This is a hard rule. Using npm will break build/test process.**

## Project Overview

This is a Turborepo monorepo for a Singapore bus arrival tracking app, split into:
- **Frontend**: React 19 + Vite (in `apps/web/`)
- **Backend**: Hono API on Bun runtime (in `apps/api/`)
- **Shared**: TypeScript types for type safety between frontend and backend (in `packages/shared/`)

## Commands

### Development
From the **root directory** (uses Turborepo):
```bash
bun dev          # Start both frontend and backend concurrently
bun build        # Build all packages
bun test         # Run all tests
bun lint         # Lint all packages
bun clean        # Run clean script in all packages (removes build artifacts)
bun clean:cache  # Clean Turborepo cache only
bun clean:deps   # Remove all node_modules directories
```

### Frontend (`apps/web/`)
```bash
bun dev                # Start Vite dev server (http://localhost:5173)
bun build              # Type-check and build for production
bun preview            # Preview production build
bun lint               # Run ESLint
bun test               # Run tests in watch mode
bun run test:run       # Run tests once
bun run test:ui        # Run tests with Vitest UI
bun run test:coverage  # Run tests with coverage
```

To run a single test file:
```bash
bun test apps/web/src/path/to/file.test.ts
```

### Backend (`apps/api/`)
```bash
bun dev          # Start API with watch mode (http://localhost:3001)
bun build        # Build for Bun runtime
bun start        # Run production build
bun test         # Run Bun tests
```

### Shared Types (`packages/shared/`)
```bash
bun build        # Type-check TypeScript
bun lint         # Type-check without emitting
```

## Architecture

### Monorepo Structure
- **Turborepo** orchestrates builds, dev servers, and tests across workspaces
- **Bun workspaces** manage dependencies (`workspace:*` protocol)
- **Shared package** provides TypeScript types imported by both frontend and backend
- Frontend proxies `/api/*` requests to backend via Vite proxy (see `apps/web/vite.config.ts`)

### Frontend Architecture (`apps/web/`)

#### Tech Stack
- **Runtime**: Bun v1.2.4
- **Build Tool**: Rolldown (via `rolldown-vite`) with `@vitejs/plugin-react-oxc`
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` plugin
- **State Management**: Zustand
- **Storage**: IndexedDB (via `idb` library)
- **Testing**: Vitest + Testing Library + MSW (Mock Service Worker)
- **UI Components**: Radix UI primitives + shadcn/ui patterns

#### Feature-Based Organization
Code is organized by feature under `apps/web/src/features/`:

```
src/features/<feature-name>/
├── components/     # React components
├── dtos/          # API response types (from LTA DataMall)
├── mappers/       # Transform DTOs → domain models
├── models/        # Domain/business logic types
└── stores/        # Zustand stores (state + API calls)
```

Current features: `bus-arrivals/`, `search-bar/`, `favorites/`

Each feature exports its public API through an `index.ts` barrel file.

#### Data Flow Pattern
1. **DTO Layer** (`dtos/`): Raw API response types matching LTA DataMall schema
2. **Mapper Layer** (`mappers/`): Pure functions to transform DTOs to domain models
3. **Model Layer** (`models/`): Business domain types (e.g., `BusStop`, `BusService`)
4. **Store Layer** (`stores/`): Zustand stores manage state, fetch data, call mappers
5. **Component Layer** (`components/`): React components consume stores via hooks

This ensures API contracts don't leak into business logic.

#### Storage Layer
- **Location**: `apps/web/src/lib/storage/`
- **Technology**: IndexedDB via `idb` library
- **Stores**:
  - `busStops`: Cached bus stop data
  - `metadata`: Last update timestamps
  - `favorites`: User's favorite bus stops
- **Pattern**: Stale-while-revalidate (stores check cache validity and refetch if stale)

#### UI Components
- **Base components**: `apps/web/src/components/ui/` (shadcn/ui patterns)
- **Styling utilities**: `clsx` + `tailwind-merge` in `apps/web/src/lib/utils.ts`
- **Variants**: `class-variance-authority` for component variants
- **Icons**: `lucide-react`

#### Tailwind CSS v4 Syntax
Tailwind CSS v4 includes built-in linting that flags outdated selector syntax. When writing arbitrary selectors (especially for child element targeting), use the newer syntax:

**Old syntax (v3 style)**: `[&_[cmdk-group-heading]]:font-medium`
**New syntax (v4)**: `**:[[cmdk-group-heading]]:font-medium`

The `**:` prefix replaces the older `[&_...]` pattern for better readability and consistency. If you see linting warnings about this, update the selectors to use the new syntax.

#### Testing Setup
- **Framework**: Vitest with jsdom environment
- **Mocking**: MSW server configured in `apps/web/src/mocks/server.ts`
- **Setup**: `apps/web/src/test/setup.ts` (Testing Library matchers, fake-indexeddb)
- **Path alias**: `@/*` → `./src/*` (configured in both `vite.config.ts` and `vitest.config.ts`)
- **Coverage**: Excludes test files, mocks, and type definitions

### Backend Architecture (`apps/api/`)

#### Tech Stack
- **Runtime**: Bun
- **Framework**: Hono (lightweight web framework)
- **Middleware**: CORS, Logger
- **API**: Proxies/aggregates LTA DataMall API endpoints

#### Routes
Routes mirror LTA DataMall API structure:
- `GET /api/ltaodataservice/v3/BusArrival?BusStopCode=12345` - Bus arrivals for a stop
- `GET /api/ltaodataservice/BusStops` - All bus stops (auto-aggregates paginated LTA results)
- `GET /health` - Health check

#### Configuration
API key is managed server-side via `apps/api/.env`:
```bash
LTA_DATAMALL_API_KEY=your_api_key_here
PORT=3001  # optional
```

**Important**: API key is NEVER exposed to the frontend. Frontend proxies through backend.

### Shared Types (`packages/shared/`)
- **Purpose**: Type-safe contracts between frontend and backend
- **Location**: `packages/shared/src/types/`
- **Types**: Bus arrival DTOs, bus stop DTOs
- **Import**: Both apps import via `@my-bus-assistant/shared`

## Key Design Decisions

### API Key Security
- LTA DataMall API key lives in `apps/api/.env` (server-side only)
- Frontend makes requests to `/api/*`, which Vite proxies to backend
- Backend adds API key to LTA requests

### Bus Stops Aggregation
- LTA DataMall returns bus stops in paginated responses (500 at a time)
- Backend automatically fetches all pages and returns complete dataset
- Frontend caches result in IndexedDB with configurable refresh interval

### Stale-While-Revalidate Pattern
- Frontend serves cached data immediately
- Checks cache freshness based on timestamp
- Refetches in background if stale
- Updates UI when fresh data arrives

## Development Workflow

1. **Setup**: Run `bun install` from root, create `apps/api/.env` with LTA API key
2. **Dev mode**: Run `bun dev` from root (starts both frontend + backend)
3. **Testing**: Run `bun test` from root or within individual app directories
4. **Building**: Run `bun build` from root (Turborepo handles dependencies)

## Environment Requirements
- **Bun**: v1.2.4 or higher
- **LTA API Key**: Get from https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html
