# Conductor

[![NX](https://img.shields.io/badge/Nx-18+-143055?logo=nx)](https://nx.dev)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io)](https://socket.io)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-24-00D8A2?logo=puppeteer)](https://pptr.dev)
[![LangChain](https://img.shields.io/badge/LangChain-Gemini-1C3C3C)](https://js.langchain.com)

**Conductor** is an AI-powered browser automation platform. Users describe a goal in plain English; a Gemini-powered agent plans browser steps; Puppeteer executes them in a real browser; results and screenshots stream live over Socket.IO.

> Demo GIF placeholder — add `docs/demo.gif` after your first successful run.

## Architecture

```
┌─────────────┐     REST (POST/GET /tasks)     ┌──────────────────┐
│  Next.js    │◄──────────────────────────────►│  NestJS API      │
│  apps/web   │     Socket.IO (live events)    │  apps/api        │
│  :3000      │◄──────────────────────────────►│  :3001           │
└─────────────┘                                └────────┬─────────┘
                                                        │
                        ┌───────────────────────────────┼────────────────┐
                        ▼                               ▼                ▼
                 ┌─────────────┐              ┌─────────────┐   ┌─────────────┐
                 │  LangChain  │              │  Puppeteer  │   │  Prisma     │
                 │  Gemini     │              │  headless   │   │  PostgreSQL │
                 │  planner    │              │  Chrome     │   │  :5432      │
                 └─────────────┘              └─────────────┘   └─────────────┘
```

### Task flow

1. User submits a goal → `POST /tasks` → `{ taskId }` (async execution).
2. API sets status `PLANNING`, calls Gemini for a JSON step plan.
3. Socket emits `task:planning` with steps.
4. Puppeteer runs task-type handlers (`web-search`, `scraper`, `health-check`).
5. Each step emits `task:step` with optional `screenshotB64`.
6. On success: `task:completed` + DB `COMPLETED`; on failure: `task:error` + `FAILED`.

## Project structure

```
conductor/
├── apps/
│   ├── web/                 # Next.js 14 (App Router) frontend
│   └── api/                 # NestJS backend + Prisma
├── libs/
│   └── shared/types/        # Shared TypeScript types & socket events
├── docker-compose.dev.yml   # PostgreSQL for local dev
├── nx.json
├── package.json
└── tsconfig.base.json
```

## Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL)
- [Google AI Studio](https://aistudio.google.com) API key (Gemini 1.5 Flash free tier)

## Setup

```bash
git clone <your-repo-url> conductor
cd conductor
cp .env.example .env
# Edit .env — set GOOGLE_GENERATIVE_AI_API_KEY

docker-compose -f docker-compose.dev.yml up -d
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

- Web UI: http://localhost:3000
- API: http://localhost:3001
- Prisma Studio: `npm run db:studio`

## Supported task types (Phase 1)

| Type | UI label | Example goal |
|------|----------|--------------|
| `web-search` | Search | `top 5 NestJS open source projects on GitHub` |
| `scraper` | Scraper / Price Check | `scrape GitHub trending repositories` |
| `health-check` | Health Check | `https://google.com, https://github.com` |

## Environment variables

See [`.env.example`](.env.example):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key |
| `API_PORT` | NestJS port (default `3001`) |
| `NEXT_PUBLIC_API_URL` | REST base URL for web |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO URL for web |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Docker Postgres + parallel `web` + `api` |
| `npm run dev:web` | Next.js only |
| `npm run dev:api` | NestJS only |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:studio` | Prisma Studio |
| `npm run build` | Build api, web, shared-types |

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Commit with clear messages; keep Phase 1 scope (no auth/queues yet).
4. Open a pull request describing changes and how you tested locally.

## License

MIT — see [LICENSE](LICENSE).
