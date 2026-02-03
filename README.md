# My Bus Assistant - Monorepo

A Singapore bus arrival tracking app built with React + Hono, organized as a Turborepo monorepo.

## Project Structure

```
my-bus-assistant/
├── apps/
│   ├── web/          # React frontend (Vite)
│   └── api/          # Hono backend (Bun)
└── packages/
    └── shared/       # Shared TypeScript types
```

## Prerequisites

- [Bun](https://bun.sh) v1.2.4 or higher
- LTA DataMall API key ([get one here](https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html))

## Setup

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

Run both frontend and backend concurrently:

```bash
bun dev
```

This starts:

- **Frontend**: http://localhost:5173 (or next available port)
- **Backend**: http://localhost:3001

The frontend automatically proxies `/api/*` requests to the backend.

## API Endpoints

| Endpoint                                                   | Description                             |
| ---------------------------------------------------------- | --------------------------------------- |
| `GET /api/ltaodataservice/v3/BusArrival?BusStopCode=12345` | Get bus arrival times for a stop        |
| `GET /api/ltaodataservice/BusStops`                        | Get all bus stops (aggregated from LTA) |
| `GET /health`                                              | Health check                            |

> **Note**: The `/BusStops` endpoint automatically fetches all paginated results from LTA DataMall and returns them in a single response.

## Testing

```bash
# Run all tests
bun test

# Test specific package
cd apps/api && bun test
cd apps/web && bun run test
```

## Building

```bash
# Build all packages
bun run build

# Build specific package
cd apps/api && bun run build
cd apps/web && bun run build
```

## Architecture

- **Frontend**: Vite + React + TailwindCSS + Zustand
- **Backend**: Hono (on Bun runtime)
- **Shared**: TypeScript DTOs for type safety across frontend/backend
- **Build**: Turborepo for caching and parallel execution

## Key Features

- ✅ Server-side API key management (never exposed to client)
- ✅ Automatic pagination aggregation for bus stops
- ✅ Input validation and error handling
- ✅ Shared TypeScript types between frontend and backend
- ✅ Fast development with Bun and Turborepo

## Next Steps (Phase 2)

- [ ] Add response caching middleware
- [ ] Add rate limiting
- [ ] Add structured logging
- [ ] Deploy to production
