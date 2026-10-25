# DECOYTRACE

A browser-only cyber deception simulation that demonstrates how fictional decoys can expose suspicious movement, generate an incident timeline, and detect changes to evidence records.

## Run & Operate

- `pnpm --filter @workspace/decoytrace run dev` — run the DECOYTRACE web app
- `pnpm --filter @workspace/decoytrace run typecheck` — typecheck the web app
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- DECOYTRACE frontend: React, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React
- DECOYTRACE state: browser React state and localStorage; SHA-256 via Web Crypto API
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/decoytrace/src/App.tsx` — DECOYTRACE pages and shared interactions
- `artifacts/decoytrace/src/simulation.ts` — fictional simulation data and logic
- `artifacts/decoytrace/src/index.css` — DECOYTRACE theme and responsive styling
- `lib/api-spec/openapi.yaml` — shared API contract

## Architecture decisions

- DECOYTRACE is intentionally browser-only; its fictional scenario state is local and does not depend on the API server or database.
- The evidence ledger is a blockchain-inspired local hash-chain demonstration, not a production integrity guarantee or real blockchain.

## Product

- Explore a fictional network, manage simulated decoys, run attack scenarios, review reconstructed incidents, and verify or tamper with a local evidence ledger.

## User preferences

- DECOYTRACE must remain a simulation: never scan, connect to, monitor, or attack real systems; never use real credentials or real targets.

## Gotchas

- All app data stays in the current browser's localStorage; it is not shared between users or devices.
- Fictional IP addresses and simulated MITRE ATT&CK mappings are explanatory sample data only.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
