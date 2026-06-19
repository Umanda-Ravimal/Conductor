# Conductor

**Describe a goal in plain English. Conductor plans the browser steps, runs them in a real Chrome instance, and streams live progress back to you.**

Conductor is an AI-powered browser automation platform. A Gemini agent turns natural-language goals into structured execution plans; Puppeteer carries them out in a headless browser; results, logs, and screenshots arrive in real time over Socket.IO.

[![Nx](https://img.shields.io/badge/Nx-18+-143055?logo=nx)](https://nx.dev)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io)](https://socket.io)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-24-00D8A2?logo=puppeteer)](https://pptr.dev)
[![LangChain](https://img.shields.io/badge/LangChain-Gemini-1C3C3C)](https://js.langchain.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Task types](#task-types)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Natural-language goals** — Submit tasks like “top 5 NestJS projects on GitHub” without writing selectors or scripts.
- **AI planning** — Gemini (via LangChain) produces a typed JSON execution plan tailored to the task type.
- **Real browser execution** — Puppeteer drives Chrome with stealth plugins for reliable automation.
- **Live streaming** — Step-by-step logs, status updates, and base64 screenshots over Socket.IO.
- **Task history** — Completed runs are persisted in PostgreSQL via Prisma.
- **Monorepo DX** — Nx workspace with shared types between the Next.js frontend and NestJS API.

---

## How it works

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

### Task lifecycle

1. User submits a goal → `POST /tasks` → API returns `{ taskId }` and runs execution asynchronously.
2. Status moves to `PLANNING`; Gemini returns a JSON step plan.
3. Socket emits `task:planning` with the planned steps.
4. Puppeteer executes handlers for the task type (`web-search`, `scraper`, `health-check`).
5. Each step emits `task:step` with optional `screenshotB64`.
6. On success → `task:completed` and DB status `COMPLETED`. On failure → `task:error` and `FAILED`.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS, Zustand |
| Backend | NestJS, Socket.IO, class-validator |
| Automation | Puppeteer, puppeteer-extra (stealth) |
| AI | LangChain + Google Gemini |
| Database | PostgreSQL 16, Prisma |
| Tooling | Nx monorepo, TypeScript 5.4 |

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js 18+** | Required for the monorepo |
| **Docker Desktop** | Runs PostgreSQL locally via `docker-compose.dev.yml` |
| **Google AI API key** | Free tier from [Google AI Studio](https://aistudio.google.com) (Gemini) |
| **Chrome** *(optional)* | System Chrome improves stealth; see [Environment variables](#environment-variables) |

---

## Quick start

### 1. Clone and configure

```bash
git clone https://github.com/your-username/conductor.git
cd conductor
cp .env.example .env
```

Open `.env` and set your Gemini API key:

```env
GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"
```

### 2. Start the database

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Install dependencies and migrate

```bash
npm install
npm run db:generate
npm run db:migrate
```

### 4. Run the app

```bash
npm run dev
```

This starts PostgreSQL (if not already running), the NestJS API, and the Next.js web app in parallel.

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3000 |
| API | http://localhost:3001 |
| Prisma Studio | `npm run db:studio` |

### Try it

1. Open http://localhost:3000
2. Choose a task type (Search, Scraper, or Health Check)
3. Enter a goal and click **Run Agent**
4. Watch live steps and screenshots on the task detail page

> **Tip (Windows):** If Puppeteer struggles with bundled Chromium, point it at your installed Chrome in `.env`:
>
> ```env
> PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
> ```

---

## Task types

| Type | UI label | Example goal |
|------|----------|--------------|
| `web-search` | Search | `top 5 NestJS open source projects on GitHub` |
| `scraper` | Scraper / Price Check | `scrape GitHub trending repositories` |
| `health-check` | Health Check | `https://google.com, https://github.com` |

The planner supports steps such as `navigate`, `search`, `click`, `scroll`, `extract`, `summarise`, and `healthCheck`. See [`planner.prompt.ts`](apps/api/src/agent/prompts/planner.prompt.ts) for the full execution plan schema.

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env` and adjust as needed.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini API key from Google AI Studio |
| `API_PORT` | No | NestJS port (default `3001`) |
| `API_URL` | No | API base URL (default `http://localhost:3001`) |
| `FRONTEND_URL` | No | CORS origin for the web app |
| `NEXT_PUBLIC_API_URL` | Yes | REST base URL used by the frontend |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Socket.IO URL used by the frontend |
| `PUPPETEER_EXECUTABLE_PATH` | No | Path to system Chrome |
| `PUPPETEER_HEADLESS` | No | Set to `false` to show the browser window |
| `PUPPETEER_DEBUG_PORT` | No | Chrome remote debugging port |

---

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Docker Postgres + parallel `web` + `api` |
| `npm run dev:web` | Next.js frontend only |
| `npm run dev:api` | NestJS API only |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run build` | Build `api`, `web`, and `shared-types` |

---

## Project structure

```
conductor/
├── apps/
│   ├── web/                 # Next.js 14 frontend (App Router)
│   └── api/                 # NestJS backend, Prisma, Puppeteer, agent
├── libs/
│   └── shared/types/        # Shared TypeScript types & Socket.IO events
├── docker-compose.dev.yml   # Local PostgreSQL
├── nx.json
├── package.json
└── tsconfig.base.json
```

---

## Contributing

Contributions are welcome. To propose a change:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and test locally with `npm run dev`
4. Open a pull request with a clear description and test steps

Please keep pull requests focused. Auth, job queues, and multi-tenant features are out of scope for the current phase.

---

## License

[MIT](LICENSE) © 2026 Conductor
