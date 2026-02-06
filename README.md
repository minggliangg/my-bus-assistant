# My Bus Assistant

A modern, fast Singapore bus arrival tracking web app with real-time updates, favorites, and nearby stops. Built with React 19, Hono, and Bun in a Turborepo monorepo.

## Project Structure

```
my-bus-assistant/
├── apps/
│   ├── web/          # React frontend (Vite)
│   └── api/          # Hono backend (Bun)
└── packages/
    └── shared/       # Shared TypeScript types
```

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Create apps/api/.env with your LTA DataMall API key
echo "LTA_DATAMALL_API_KEY=your_key_here" > apps/api/.env

# 3. Start development servers
bun dev
```

Open http://localhost:5173 and start tracking buses! 🚌

## Prerequisites

- [Bun](https://bun.sh) v1.2.4 or higher
- LTA DataMall API key ([get one here](https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html))

## Detailed Setup

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Configure API key:**

   Create `apps/api/.env`:

   ```bash
   LTA_DATAMALL_API_KEY=your_api_key_here
   PORT=3001  # optional, defaults to 3001
   ```

## Development

### Running the App

```bash
# From root - starts both frontend and backend
bun dev
```

This starts:

- **Frontend**: http://localhost:5173 (Vite dev server with hot reload)
- **Backend**: http://localhost:3001 (Bun with watch mode)

The frontend automatically proxies `/api/*` requests to the backend via Vite's proxy configuration.

### Development Tips

- **Frontend-only changes**: Just edit files in `apps/web/` - Vite will hot reload
- **Backend-only changes**: Edit files in `apps/api/` - Bun watch will restart the server
- **Shared types**: Edit `packages/shared/` to update types used by both frontend and backend
- **Clear cache**: Run `bun clean` if you encounter build issues

## API Endpoints

The backend proxies LTA DataMall API requests and handles pagination automatically:

| Endpoint                                                   | Description                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| `GET /api/ltaodataservice/v3/BusArrival?BusStopCode=12345` | Get real-time bus arrival data for a specific stop         |
| `GET /api/ltaodataservice/BusStops`                        | Get all Singapore bus stops (~5,000 stops, auto-paginated) |
| `GET /health`                                              | Health check endpoint                                      |

> **Note**: The frontend automatically proxies all `/api/*` requests to the backend (http://localhost:3001). The backend adds the LTA API key to upstream requests, keeping credentials secure.

## Testing

```bash
# Run all tests (from root)
bun test

# Frontend tests
cd apps/web
bun test              # Watch mode
bun run test:run      # Run once
bun run test:ui       # Open Vitest UI
bun run test:coverage # Generate coverage report

# Run a single test file
bun test src/path/to/file.test.ts

# Backend tests
cd apps/api
bun test
```

## Building

```bash
# Build all packages
bun build

# Build specific package
cd apps/api && bun build
cd apps/web && bun build

# Lint all packages
bun lint

# Clean build artifacts
bun clean        # Clean all packages
bun clean:cache  # Clean Turborepo cache only
bun clean:deps   # Remove all node_modules
```

## Features

### Core Functionality

- 🚏 **Real-time Bus Arrivals**: Track bus arrivals at any Singapore bus stop
- ⭐ **Favorites**: Save frequently used bus stops for quick access
- 📍 **Nearby Stops**: Find bus stops near your current location with interactive map
- 🔍 **Smart Search**: Search by bus stop code, road name, or description
- 🔄 **Auto-refresh**: Optional 30-second auto-refresh for live updates
- 🎨 **Dark Mode**: System-aware theme with manual toggle
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile

### Technical Features

- ⚡ **Offline-first**: IndexedDB caching with stale-while-revalidate pattern
- 🔒 **Secure**: API keys managed server-side only
- 🚀 **Fast**: Built on Bun runtime with Rolldown bundler
- 📦 **Type-safe**: Full TypeScript with shared types across frontend/backend
- 🧪 **Well-tested**: Comprehensive test coverage with Vitest + Testing Library
- 🗺️ **Interactive Maps**: MapLibre GL for bus stop visualization

## Architecture

### Tech Stack

**Frontend** (`apps/web/`)

- React 19 with TypeScript
- Rolldown (via `rolldown-vite`) + @@vitejs/plugin-react for blazing fast builds
- TanStack Router for file-based routing
- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Zustand for state management
- IndexedDB (via `idb`) for offline storage
- MapLibre GL for interactive maps
- Vitest + Testing Library + MSW for testing
- Radix UI + shadcn/ui for accessible components

**Backend** (`apps/api/`)

- Hono web framework on Bun runtime
- LTA DataMall API integration
- CORS + Logger middleware
- Automatic pagination handling

**Shared** (`packages/shared/`)

- TypeScript types shared between frontend and backend
- DTO definitions for API contracts

**Build System**

- Turborepo for task orchestration and caching
- Bun workspaces for dependency management

### Frontend Architecture

The frontend follows a **feature-based organization** pattern:

```
src/features/<feature-name>/
├── components/     # React components
├── dtos/          # API response types (from LTA DataMall)
├── mappers/       # Transform DTOs → domain models
├── models/        # Domain/business logic types
└── stores/        # Zustand stores (state + API calls)
```

**Data Flow**: DTO → Mapper → Model → Store → Component

This separation ensures API contracts don't leak into business logic and makes the codebase maintainable.

### Caching Strategy

- **Bus stops**: Cached in IndexedDB, refreshes every 7 days (configurable)
- **Bus arrivals**: Throttled to 30-second intervals, cached in localStorage
- **Stale-while-revalidate**: Shows cached data immediately, fetches fresh data in background
- **Favorites**: Persisted in IndexedDB with timestamp tracking

### Why These Technologies?

- **Bun**: Fastest JavaScript runtime, simplifies the stack (runtime + package manager + test runner)
- **Rolldown**: Next-gen bundler written in Rust, significantly faster than Webpack/Vite
- **React 19**: Latest React with improved performance and new features
- **Hono**: Ultrafast web framework, simpler than Express with better TypeScript support
- **Zustand**: Lightweight state management without boilerplate (vs Redux)
- **IndexedDB**: Browser-native database for offline-first functionality
- **TanStack Router**: File-based routing with excellent TypeScript support
- **Turborepo**: Efficient monorepo builds with intelligent caching

## Environment Variables

### Backend (`apps/api/.env`)

```bash
LTA_DATAMALL_API_KEY=your_api_key_here  # Required: LTA DataMall API key
PORT=3001                                # Optional: API server port (default: 3001)
```

### Frontend (optional, `apps/web/.env`)

```bash
VITE_BUS_STOPS_REFRESH_DAYS=7           # Days before refreshing bus stops cache (default: 7)
VITE_THROTTLE_INTERVAL_MS=30000         # API throttle interval in ms (default: 30000)
```

## Project Commands Reference

| Command           | Description                                 |
| ----------------- | ------------------------------------------- |
| `bun dev`         | Start both frontend and backend in dev mode |
| `bun build`       | Build all packages                          |
| `bun test`        | Run all tests                               |
| `bun lint`        | Lint all packages                           |
| `bun clean`       | Remove build artifacts from all packages    |
| `bun clean:cache` | Clear Turborepo cache                       |
| `bun clean:deps`  | Remove all node_modules directories         |

## Contributing

This project follows a feature-based architecture. When adding new features:

1. Create a new feature directory under `apps/web/src/features/`
2. Follow the established pattern: `components/`, `dtos/`, `mappers/`, `models/`, `stores/`
3. Export public APIs through an `index.ts` barrel file
4. Write tests for all new functionality
5. Update types in `packages/shared/` if they affect the API contract

For more detailed guidance, see [CLAUDE.md](./CLAUDE.md).

## License

This project is for educational and personal use.
