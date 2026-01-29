# MSPBots React Template

This is a full-stack React template for the MSPBots platform.


It includes:

- Frontend: React + TypeScript + Tailwind CSS + `@mspbots/ui`
- Backend: Deno runtime (`service/`) + REST APIs
- Platform integration: routing, layout, auth redirect, micro-frontend bridge

This document is an operator manual for LLMs working inside a project created from this template.

## Golden Rules (for LLMs)

1. Always follow the target package’s README before using its API.
2. Do not invent APIs, props, config fields, or file locations.
3. Frontend API calls must use `$fetch` / `@mspbots/fetch` (no raw `fetch()` unless a package README requires it).
4. Never log or expose the token string. Use `window.useAccess()` only for roles/payload debugging.
5. Route/menu permissions should be implemented with page `meta` (`menu` / `route`) first, and only then with element-level gating (`<Permission />`).

## Project Structure

```
.
├── pages/                 Frontend pages (EDITABLE)
├── service/               Backend directory (EDITABLE)
│   ├── deno.json          Backend imports & permissions
│   └── server.ts          API routes
├── mspbot.config.ts       App/system config
└── package.json           Frontend dependencies & scripts
```

## Quick Start

Install dependencies:

- `pnpm install`

Frontend:

- Edit `pages/Home.tsx` as a reference.
- Add new pages under `pages/` (routing is automatic).

Backend:

- Add API routes in `service/server.ts`.
- Add backend dependencies with Deno:
  - `cd service && deno add npm:<package>`

Development:

- `pnpm dev`
- `pnpm build`

Notes:

- `pnpm dev` will also run `predev` (`cd service && deno install`) to prepare the backend runtime.

## Frontend: Routing, Menus, Permissions

### 1) File-based routing (`pages/`)

Routing is generated from file paths:

- `pages/Home.tsx` → `/`
- `pages/User/List.tsx` → `/user/list`
- `pages/User/[id].tsx` → `/user/:id`

### 2) Page meta (the primary API)

Each page can export a `meta` object to control label/icon/order, menu visibility, and route access:

```tsx
export const meta = {
  label: 'Admin',
  icon: 'Settings',
  order: 10,
  menu: ['admin'],   // show in menu only if role matches
  route: ['admin'],  // allow visiting only if role matches
}
```

- `menu`: controls whether the page appears in navigation
- `route`: controls whether the route is accessible (otherwise redirects to `/403`)

### 3) Element-level gating with `<Permission />`

For smaller UI fragments inside a page, use `Permission` from `@mspbots/ui`:

```tsx
import { Button, Permission } from '@mspbots/ui'

<Permission roles={['admin']} fallback={null}>
  <Button>Admin Action</Button>
</Permission>
```

`Permission` reads roles from `window.useAccess?.()` (injected by `@mspbots/system`).

## Auth Redirect (no/invalid token → login)

This template can redirect to a login page when the token is missing or invalid:

- Config: `system.auth.enabled = true` and `system.auth.loginPath = '/apps/mb-platform-user/login'`
- Behavior: `window.location.href = loginPath`
- Loop prevention:
  - If already on `loginPath` (or its sub-path), it will not redirect again
  - Uses `sessionStorage['__mspbots_auth_redirect__']` to avoid repeating the same redirect within a session

## Backend: Adding APIs

Add new REST endpoints in `service/server.ts`. Keep handlers small, type-safe, and return stable JSON.

Frontend should call backend via `$fetch` (injected globally by system) or by importing from `@mspbots/fetch` as required.

## Core Packages You Must Read (before coding)

This template relies on several core packages. Always read their README before using them.

Docs location in a generated project:

- Frontend packages: `node_modules/<pkg>/README.md`
- Backend (Deno) packages: `service/node_modules/<pkg>/README.md` (after `pnpm dev` / `deno install`)

| Package | Scope | When to use it | Readme path |
| :--- | :--- | :--- | :--- |
| `@mspbots/routes` | Frontend (build) | When you add/rename pages under `pages/`, want menus, or need page-level role gating via `meta.menu` / `meta.route`. | `node_modules/@mspbots/routes/README.md` |
| `@mspbots/system` | Build + runtime inject | When you need system-level behavior: app title/icon, theme/layout, 403 handling, global `$fetch`, `window.useAccess()`, or auth redirect (`system.auth`). | `node_modules/@mspbots/system/README.md` |
| `@mspbots/react` | Build | When you need to change the build pipeline for the template. In most cases, you only configure it in `mspbot.config.ts` and let it aggregate everything. | `node_modules/@mspbots/react/README.md` |
| `@mspbots/ui` | Frontend | When you build UI pages: buttons/forms/dialogs/tables, and element-level permission gating with `<Permission />`. | `node_modules/@mspbots/ui/README.md` |
| `@mspbots/fetch` | Frontend | Whenever the frontend calls backend APIs. Prefer `$fetch` (injected) or import from this package per its README. | `node_modules/@mspbots/fetch/README.md` |
| `@mspbots/layout` | Frontend | When you customize the app shell (sidebar/header), navigation rendering, or layout behavior beyond `system.layout` config. | `node_modules/@mspbots/layout/README.md` |
| `@mspbots/bridge` | Frontend | When integrating micro-frontends: token/context sync, events, or host/sub-app communication. | `node_modules/@mspbots/bridge/README.md` |
| `@mspbots/type` | Frontend/shared | When you need shared types (page nodes, handler params, platform types) across UI and server logic. | `node_modules/@mspbots/type/README.md` |
| `@mspbots/runtime` | Backend (Deno) | When implementing backend routes in `service/server.ts`, enforcing security boundaries, accessing runtime helpers/services. | `service/node_modules/@mspbots/runtime/README.md` |

## Optional Tools (examples)

These are optional backend-side tools. Only install them when the feature is required, and always follow each package README after installing.

| Package | When to use it (backend) |
| :--- | :--- |
| `@tools/langchain-sdk` | When you need LLM calls, agents, tool execution, prompt pipelines, or RAG workflows. |
| `@tools/database` | When you need persistent storage (e.g., Postgres/MySQL) instead of in-memory data. |
| `@tools/common` | When you need shared utilities/resources or MSPBots common integrations provided by the platform. |

Install with Deno when needed:

- `cd service && deno add npm:@tools/langchain-sdk`
- `cd service && deno add npm:@tools/database`
- `cd service && deno add npm:@tools/common`

## License

MIT
