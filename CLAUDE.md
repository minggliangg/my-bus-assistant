# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `bun dev` - Start development server with HMR
- `bun build` - Type-check and build for production
- `bun preview` - Preview production build locally
- `bun lint` - Run ESLint

### Testing
- `bun test` - Run tests in watch mode
- `bun test:run` - Run tests once and exit
- `bun test:ui` - Run tests with Vitest UI
- `bun test:coverage` - Run tests with coverage report

To run a single test file:
```bash
bun test path/to/file.test.ts
```

## Architecture

### Tech Stack
- **Runtime**: Bun (package manager and runtime)
- **Build Tool**: Rolldown (via `rolldown-vite`) with `@vitejs/plugin-react-oxc`
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` plugin
- **State Management**: Zustand
- **Testing**: Vitest + Testing Library + MSW (Mock Service Worker)
- **API**: LTA DataMall API (Singapore bus arrival data)

### Feature-Based Structure
The codebase follows a feature-based organization under `src/features/`:

```
src/features/<feature-name>/
├── components/     # React components for the feature
├── dtos/          # Data Transfer Objects (API response types)
├── mappers/       # Transform DTOs to domain models
├── models/        # Domain models (business logic types)
└── stores/        # Zustand stores for state management
```

Current features: `bus-arrivals/`, `search-bar/`

Each feature exports its public API through an `index.ts` barrel file.

### Data Flow Pattern
1. **DTO Layer** (`dtos/`): Raw API response types (e.g., `BusStopDTO`)
2. **Mapper Layer** (`mappers/`): Transform DTOs to domain models (`mapBusStopDtoToModel`)
3. **Model Layer** (`models/`): Business domain types (e.g., `BusStop`, `BusService`)
4. **Store Layer** (`stores/`): Zustand stores manage state and API calls
5. **Component Layer** (`components/`): React components consume stores

This separation ensures API contracts don't leak into business logic.

### Storage Layer
The app uses IndexedDB (via `idb` library) for client-side persistence in `src/lib/storage/`:
- Bus stops are cached locally with a configurable refresh interval
- Stores manage cache validation and fetch logic with stale-while-revalidate pattern

### API Configuration
The app uses the LTA DataMall API with proxy configuration in `vite.config.ts`:
- `/api/*` routes proxy to `https://datamall2.mytransport.sg`
- Requires `VITE_LTA_DATAMALL_API_KEY` environment variable
- Supports mock API mode via `VITE_USE_MOCK_API=true` and `VITE_MOCK_API_URL`

### Environment Variables
Copy `.env.example` to `.env` and configure:
- `VITE_LTA_DATAMALL_API_KEY` - Required for real API access
- `VITE_USE_MOCK_API` - Set to `true` to use mock server
- `VITE_MOCK_API_URL` - Mock server URL (default: `http://localhost:3001`)
- `VITE_THROTTLE_INTERVAL_MS` - Bus arrival fetch throttle (default: 45000ms)
- `VITE_BUS_STOPS_REFRESH_DAYS` - Cache refresh interval (default: 7 days)

### Testing Setup
- **Framework**: Vitest with jsdom environment
- **Mocking**: MSW server configured in `src/mocks/server.ts`
- **Setup**: `src/test/setup.ts` configures Testing Library matchers
- **Coverage**: Excludes test files, mocks, and type definitions
- Path alias `@/*` resolves to `./src/*` (configured in both `vite.config.ts` and `vitest.config.ts`)

### UI Components
- Base components in `src/components/ui/` (e.g., `card.tsx`)
- Uses `class-variance-authority` for variant styling
- Uses `clsx` + `tailwind-merge` for className composition (utility in `src/lib/utils.ts`)
- Icons from `lucide-react`
