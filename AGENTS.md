# sefro-clinic-pwa

Persian clinic management PWA (Vite 8 + React 19 + TypeScript ~6.0). Single package, no monorepo.

This project follows **Trunk-Based Development (TBD)** — see below for rules.

## Commands

| `pnpm dev` | Dev server |
| `pnpm build` | `tsc -b && vite build` (flag `-b` required for project references) |
| `pnpm lint` | ESLint (typescript-eslint, react-hooks, react-refresh) |
| `pnpm typecheck` | `tsc -b` (standalone, no vite build) |
| `pnpm test` | Vitest (watch mode) |
| `pnpm test:unit` | Vitest (single run) |
| `pnpm preview` | Vite preview |
| `pnpm format` | No script — run `npx prettier --write .` manually; config exists |

## TypeScript (`tsconfig.app.json`)

- `verbatimModuleSyntax: true` — type imports/exports **must** use `import type` / `export type`
- `erasableSyntaxOnly: true` — no `enum`, no `namespace`, no constructor parameter properties
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` — all on
- Project references: `tsconfig.json` references `tsconfig.app.json` + `tsconfig.node.json`

## Styling (Tailwind v4)

- Uses `@import "tailwindcss"` (NOT `@tailwind` directives)
- Custom `@theme` tokens: `primary-*` (blue), `success-*` (emerald), `warning-*` (amber), `danger-*` (red), `info-*` (sky), `surface-*` (slate)
- Custom breakpoints: `mobile` (23.4375rem), `tablet` (48rem), `laptop` (80rem), `desktop` (90rem), `largeDesktop` (120rem)
- Prettier sorts Tailwind classes automatically via `prettier-plugin-tailwindcss`

## Architecture

- **Entry**: `src/main.tsx` — `<ToastProvider>` wraps `<RouterProvider router={router}>`
- **Router** (`src/routes/index.tsx`): `createBrowserRouter` — App layout (Sidebar + `<Outlet>`) as parent route (`/`); Dashboard, DesignSystem, catch-all 404 as children; Auth at `/auth` (separate layout, no sidebar)
- **Framework**: `react-router` v7 (unified package replacing `react-router-dom`)
- **Icons**: `react-icons` (`Bi*`, `Pi*`, `Ci*`, `Md*`, `Io5*`, `Fa*`, `Fc*` families in use)
- **UI components** (`src/components/ui/`): custom design system, re-exported via barrel (`index.ts`)
- **Toast** (`src/components/toast/`): context-based (`useToast()` hook); provider required at root
- **React Compiler**: enabled via `@rolldown/plugin-babel` + `reactCompilerPreset` (impacts dev/build perf)
- **RTL**: `lang="fa" dir="rtl"` in `index.html`; all UI is Persian

## Package manager

pnpm (confirmed by `pnpm-lock.yaml`).

## Trunk-Based Development Rules

This project follows **Trunk-Based Development (TBD)**:

1. **Short-lived branches** — branches live < 24 hours. If a branch is older, rebase or abandon it.
2. **Small commits** — each commit is 50–200 lines max. If a change exceeds 400 lines, split it.
3. **Atomic changes** — each commit leaves `main` in a releasable state. Never commit broken builds.
4. **Feature flags** — incomplete features must be gated. Never merge dead/dormant code without a flag.
5. **Fast CI** — every push to `main` triggers CI (`.github/workflows/ci.yml`):
   - Lint → TypeCheck → Tests → Build
   - Must complete in < 10 minutes
6. **Merge frequently** — merge to `main` multiple times per day. Each commit is a release candidate.
7. **Conventional commits** — use `feat:`, `fix:`, `refactor:`, `test:`, `ci:`, `chore:`, `docs:` scope prefixes.

## CI/CD

- **GitHub Actions** at `.github/workflows/ci.yml`
- Triggered on push to `main` and on PRs to `main`
- Jobs: `fast-checks` (lint + typecheck + test:unit + build)
- Staging/production deploy: manual via `workflow_dispatch` or release publish

## OpenCode config

- `opencode.json` enables the Stitch MCP (Google design tool integration) — use for design-system-aware screen generation.
