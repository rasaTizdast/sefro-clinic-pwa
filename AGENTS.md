# sefro-clinic-pwa

Persian clinic management PWA (Vite 8 + React 19 + TypeScript ~6.0). Single package, no monorepo, no tests, no CI.

## Commands

| `pnpm dev` | Dev server |
| `pnpm build` | `tsc -b && vite build` (flag `-b` required for project references) |
| `pnpm lint` | ESLint (typescript-eslint, react-hooks, react-refresh) |
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

## OpenCode config

- `opencode.json` enables the Stitch MCP (Google design tool integration) — use for design-system-aware screen generation.
