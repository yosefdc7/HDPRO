# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

### Hardware Inventory Pro (`artifacts/hardware-inventory`)
- Frontend-only React + Vite app (NO backend, NO database, NO API calls)
- All data is hardcoded mock JSON in `src/lib/mock-data.ts` + localStorage
- Built for Filipino hardware store owners (RJ Hardware & Construction Supply)
- Pages: Login, Dashboard, Products, Product Detail, Movements, Add Movement, Suppliers, Settings
- Auth: localStorage flag `hw_logged_in` (mock-only, not real auth)
- Store switcher: localStorage `hw_store_id`
- New movements saved to: localStorage `hw_movements`
- Tech: wouter routing, shadcn/ui, lucide-react, Tailwind CSS v4
- Preview path: `/`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
