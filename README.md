<div align="center">

# 📈 DhanTracker

**A full-stack watchlist, trade-journal, and research workspace for NSE (India) retail traders.**

Live prices for the entire Nifty 500, structured trade logging against a rule-based setup taxonomy, and freeform research canvases — all in one app.

[![Live Demo](https://img.shields.io/badge/demo-dhan--tracker.vercel.app-black?style=for-the-badge&logo=vercel)](https://dhan-tracker.vercel.app)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)

</div>

<!--
  Add a real screenshot or short screen-recording GIF here before publishing —
  e.g. ![DhanTracker watchlist view](./docs/screenshot.png)
  A watchlist table (live prices + sector + market cap) or the trade ledger
  makes the strongest first impression.
-->

---

## Overview

DhanTracker is a fullstack Next.js application built for rule-based NSE traders who want their watchlists, trade history, and research notes in one place instead of scattered across spreadsheets and screenshots. It tracks live prices for all 500 Nifty constituents, lets traders log every trade against a structured setup taxonomy for later accuracy analysis, and gives them a freeform canvas for market and stock research.

It was built end-to-end — schema design, auth, a batched live-market-data pipeline, and the UI — as a single-developer full-stack project.

## ✨ Features

- **📊 Live Watchlists** — Predefined Nifty 50 / 100 / Midcap 150 / Smallcap 250 / 500 lists, plus unlimited custom watchlists with drag-and-drop reordering, per-stock notes, and live LTP, % change, sector, and market cap.
- **📓 Trade Ledger** — Structured trade logging against a defined setup taxonomy (Quick Trade, HIT, DIT, WIT, MIT, QIT, HYIT, YIT), with priority, entry/stop-loss/target, P&L, and screenshot attachments.
- **📈 Dashboard Analytics** — Accuracy broken down by trade setup, net P&L, best/worst trades, at a glance.
- **🔬 Research Boards** — Freeform [tldraw](https://tldraw.dev) whiteboards for per-market, per-sector, or per-stock research.
- **🏦 High Weightage Stocks** — Sector-wise breakdown of the top constituents driving each index.
- **🔐 Auth** — Google OAuth and email/password (bcrypt-hashed), password reset via transactional email, protected routes enforced in middleware.

## 🏗️ Architecture: the live price pipeline

The most interesting engineering problem in this app is keeping 500 live stock prices fresh for every user without hammering a third-party API or blocking page loads. The pipeline:

```
yahoo-finance2 — batched quote() calls (~5 requests cover all 500 symbols,
                 vs. one request per symbol with a naive approach)
        │
        ▼
In-memory server cache — TTL: 15 min while market is open, 1 hr while closed
        │
        ├── GET  /api/prices/all      full snapshot, used once at app boot
        ├── POST /api/prices          on-demand fetch for custom-watchlist
        │                             stocks outside the Nifty 500
        └── POST /api/prices/refresh  manual refresh + scheduled poll
        │
        ▼
Zustand price store  ⇄  TanStack Query (boot hydration + 15-min poll)
        │
        ▼
Virtualized watchlist UI (TanStack Virtual — smooth scrolling through
                           500-row lists without rendering off-screen rows)
```

A few deliberate design decisions worth calling out:

- **Batched fetching over per-symbol requests.** Fetching 500 symbols individually is slow and fragile against rate limits; `quote()` accepts an array and returns them all in a handful of calls.
- **Bounded concurrency, not unlimited.** Batched requests still run through a small worker-pool helper (`fetchPooled`) so outbound request bursts stay capped, rather than firing every batch simultaneously.
- **Prices are never persisted to Postgres.** They're inherently transient, so they live only in the server's in-memory cache and the client's Zustand store — the database only holds durable user data (trades, notes, custom watchlists, research).
- **Static data as a safety net.** Predefined index constituents (symbol, company name, sector, last-known market cap) ship as static data in `src/data/indices/`, so watchlists render instantly on first load even before the live cache is warm, and sector classification doesn't depend on a live API call succeeding.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS, Radix UI primitives, shadcn-style components |
| **Client State** | Zustand (UI/price state), TanStack Query (server-state cache & polling) |
| **Data-heavy UI** | TanStack Virtual (virtualized lists), Recharts (dashboard charts), Framer Motion |
| **Forms & Validation** | React Hook Form + Zod |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | NextAuth v5 (JWT sessions) — Google OAuth + credentials |
| **Market Data** | yahoo-finance2 (batched quotes), custom in-memory TTL cache |
| **Whiteboards** | tldraw |
| **File Storage** | AWS S3 (trade screenshots, presigned uploads) |
| **Email** | Resend (password reset, contact form) |
| **Hosting** | Vercel |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (local, or a hosted instance like Neon/Supabase)

### 1. Clone and install

```bash
git clone https://github.com/navbug/DhanTracker.git
cd DhanTracker
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Generate with `npx auth secret` |
| `NEXTAUTH_URL` | ✅ | App URL (e.g. `http://localhost:3000` in dev) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional | Google OAuth credentials, from Google Cloud Console |
| `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET_NAME` | Optional | S3 for trade-screenshot uploads |
| `RESEND_API_KEY` / `EMAIL_FROM` / `CONTACT_OWNER_EMAIL` | Optional | Transactional email (password reset, contact form) |

### 3. Set up the database

```bash
npm run db:push       # push the Prisma schema to your database
npm run db:generate   # generate the Prisma client
npm run db:studio     # optional — browse the DB in Prisma Studio
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:migrate` | Create/apply a Prisma migration |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Open Prisma Studio |

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Landing / sign-in (unauthenticated)
│   ├── (dashboard)/                # Protected app shell + pages
│   │   ├── dashboard/               # Trade analytics
│   │   ├── watchlist/[id]/          # Predefined + custom watchlists
│   │   ├── trade-ledger/            # Trade logging
│   │   ├── high-weightage/          # Sector-wise top constituents
│   │   └── research/[id]/           # tldraw research boards
│   └── api/
│       ├── auth/                    # NextAuth routes
│       ├── watchlists/              # Custom watchlist CRUD + reordering
│       ├── trades/                  # Trade ledger CRUD
│       ├── prices/                  # Live price snapshot / on-demand / refresh
│       ├── stocks/search/           # Stock search/autocomplete
│       ├── research/                # Research board CRUD
│       └── upload/                  # S3 presigned-upload endpoint
├── components/
│   ├── ui/                          # Base UI primitives
│   ├── watchlist/                   # Watchlist table, rows, modals
│   ├── trade-ledger/                # Trade ledger components
│   ├── dashboard/                   # Charts and analytics widgets
│   └── research/                    # tldraw board wrapper
├── data/indices/                    # Static Nifty 50/100/Midcap150/Smallcap250/500 data
├── lib/
│   ├── db.ts                        # Prisma singleton
│   ├── auth.ts / auth.config.ts     # NextAuth configuration
│   ├── cache.ts                     # In-memory TTL price cache
│   ├── cache-warmer.ts              # Scheduled Nifty 500 warm-up
│   ├── yahoo-finance.ts             # Yahoo Finance client + NSE symbol mapping
│   ├── fetch-pool.ts                # Bounded-concurrency fetch helper
│   └── utils.ts
├── hooks/                           # usePrices, useWatchlist, etc.
├── store/                           # Zustand stores (prices, watchlists, notes, UI)
├── types/                           # Shared TypeScript types
└── middleware.ts                    # Route protection
```

## 🌐 Deployment

Deployed on Vercel. If you fork this, a few things worth knowing:

- Point the Vercel project's function region at Mumbai (`bom1`) — this app talks to NSE-listed tickers, so keeping compute close to India reduces latency on price fetches.
- Set every environment variable from `.env.example` in the Vercel dashboard before your first deploy — the app fails auth and DB calls without them.
- The scheduled cache warm-up runs via `instrumentation.ts` on server start, plus a manual "Refresh prices" action in the UI that hits `/api/prices/refresh` on demand.

---

<div align="center">

**[Live Demo](https://dhan-tracker.vercel.app)** · Built by [@navbug](https://github.com/navbug)

</div>