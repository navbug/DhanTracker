# DhanTracker

A SAAS tool built using AI for rule-based traders. Manage trade ledgers, custom watchlists, dashboard analytics, and research whiteboards — all in one clean interface.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth v5 (Credentials + Google OAuth)
- **Styling**: TailwindCSS + Shadcn UI + Sonner (notifications)
- **State**: TanStack Query (server state) + Zustand (UI state)
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Virtualization**: TanStack Virtual (for stock lists)
- **Whiteboards**: tldraw
- **Stock Data**: stock-nse-india (NSE stocks data)

## Features

- 📊 **Trade Ledger** — Log trades with setup (WIT/MIT/HIT/etc), priority, entry/exit, screenshots, P&L
- 👁️ **Watchlists** — Pre-defined (Nifty50/100/Midcap150/Smallcap250) + custom watchlists
- 📈 **Dashboard** — Accuracy by trade setup, Net P&L, best trades, sector weightages
- 🔬 **Research Boards** — tldraw whiteboards for market/sector/stock research
- 🏦 **High Weightage Stocks** — Top stocks across 17+ sector indices (sector-wise)

## Architecture

```
stock-nse-india → Server RAM Cache (15min TTL, per symbol)
                → PostgreSQL (user data: trades, notes, custom watchlists, research)
                → TanStack Query (browser cache)
                → Zustand + React UI
```

**Key rules:**
- Pre-defined index stocks (Nifty50, etc.) are static JSON in `/src/data/indices/` — NOT stored in DB
- Prices are **never** stored in PostgreSQL
- Server cache is keyed by symbol (shared across users for same stock)
- Stock list prices are batch-fetched (50 at a time) server-side

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo>
cd dhan-tracker
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — Run `npx auth secret` to generate
- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` — From Google Cloud Console (optional)
- AWS S3 credentials for screenshot uploads (optional for initial setup)

### 3. Set up database

```bash
npm run db:push      # Push schema to DB
npm run db:generate  # Generate Prisma client
npm run db:studio    # (Optional) Open Prisma Studio to inspect DB
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Landing page (unauthenticated)
│   ├── (dashboard)/         # Protected app pages
│   │   ├── layout.tsx       # App shell (sidebar + header)
│   │   ├── dashboard/
│   │   ├── watchlist/[id]/
│   │   ├── trade-ledger/
│   │   ├── high-weightage/
│   │   └── research/
│   └── api/                 # API routes
│       ├── auth/
│       ├── watchlists/
│       ├── trades/
│       ├── prices/
│       ├── research/
│       └── upload/
├── components/
│   ├── ui/                  # Base UI components (Shadcn)
│   ├── auth/                # Auth form
│   ├── landing/             # Landing page
│   ├── layout/              # Sidebar, Header, AppShell
│   ├── watchlist/           # Watchlist page components
│   ├── trade-ledger/        # Trade ledger components
│   ├── dashboard/           # Dashboard components
│   └── research/            # Research board components
├── data/
│   └── indices/             # Static JSON for Nifty indices
│       ├── nifty50.ts
│       ├── nifty100.ts      # Add after Phase 2
│       ├── nifty-midcap150.ts
│       ├── nifty-smallcap250.ts
│       └── sector-weightages.ts
├── lib/
│   ├── db.ts                # Prisma singleton
│   ├── auth.ts              # NextAuth config
│   ├── cache.ts             # Server-side price cache (Phase 2)
│   ├── nse.ts               # stock-nse-india wrapper (Phase 2)
│   └── utils.ts             # Utility functions
├── store/
│   └── ui-store.ts          # Zustand store
├── types/
│   └── index.ts             # TypeScript types
└── middleware.ts             # Route protection
```

