# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

FILMMAKER is a web platform for managing pre-production, production, and post-production of a film or short film. All 10 modules from the product spec are implemented with real CRUD functionality, backed by Supabase (Postgres + Auth + Storage) with email/password login. Projects support real multi-user collaboration: the owner can invite people by email and assign one of the 4 README roles, enforced by Postgres RLS (not just hidden UI). `README.md` (product spec) and `TECH.md` (original stack proposal) are in Spanish and remain the source of truth for planned scope beyond what's built.

## Supabase setup (required to run the app)

The app renders a "Falta configurar Supabase" screen instead of crashing when unconfigured — that screen has the up-to-date steps. Summary:

1. Create a free project at supabase.com.
2. Run `supabase/schema.sql` (paste it into the project's SQL Editor) — creates every table, RLS policy, and the `media` storage bucket/policies in one shot. Safe to re-run.
3. Copy `.env.local.example` to `.env.local` and fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from Settings → API.
4. Restart `npm run dev`.

I (Claude) cannot create the Supabase account/project or obtain these credentials — that's a manual step for whoever is running this. I can't end-to-end test the real hosted project (real signup emails, the actual dashboard, etc.), but the RLS/permissions logic in `schema.sql` itself has been exercised against a local Postgres with stubbed `auth`/`storage` schemas (see the permissions section below) — that part is verified, not just reviewed by eye. What's still untested is everything above the database: real auth signup/login, and the UI against real data.

## Commands

```bash
npm run dev      # start Vite dev server (http://localhost:5173)
npm run build    # tsc -b (typecheck + project refs) then vite build
npm run preview  # preview the production build
npm run lint     # oxlint (fast Rust-based linter, replaces ESLint here)
```

There is no test runner configured yet. There is no `tsc --noEmit` script; run `npx tsc -b --noEmit` directly for a standalone typecheck.

## Architecture

**Stack**: React 19 + TypeScript, Vite, React Router v7 (`BrowserRouter`; routes declared in `src/App.tsx`), TanStack Query for all server state, Zustand only for small client-only UI state (`activeProjectId`), React Hook Form + Zod for every form, Supabase (`@supabase/supabase-js`) for auth/DB/storage.

**UI**: shadcn/ui, `radix-nova` style/preset (Lucide icons, Geist Variable font). Run `npx shadcn@latest add <component>` to add more primitives.

- ⚠️ The shadcn CLI resolves the `@/*` import alias from `tsconfig.json`'s own `compilerOptions.paths`, not from `tsconfig.app.json` (the file `vite.config.ts` and the app itself actually use). Both files currently declare the same `"@/*": ["./src/*"]` mapping — if you ever edit one, edit the other to match, or the CLI will silently scaffold files into a literal `./@/` directory at the repo root instead of `src/`.
- TypeScript here is on a version where `baseUrl` is deprecated in favor of bare `paths` — don't reintroduce `baseUrl`.
- This shadcn preset ships a `Field`/`FieldLabel`/`FieldError` primitive (`src/components/ui/field.tsx`) instead of the older `Form`/`FormField` RHF wrapper. `npx shadcn add form` is a dead registry entry (no files) — use `field` (already installed).
- `@fullcalendar/*` packages are pinned to `6.1.21` across `react`/`core`/`daygrid`/`interaction` — their `latest` dist-tags drifted out of sync when v7 shipped (react/core went to 7.x, daygrid/interaction didn't). Always install all four at the same explicit version.

**App shell** (`src/layouts/AppLayout.tsx`): `SidebarProvider` > `AppSidebar` + `SidebarInset` (`AppHeader` + routed `<Outlet />`).

**Auth** (`src/features/auth/`): `AuthProvider`/`useSession()` wraps `supabase.auth` session state in React Context. `RequireAuth` is a layout route that redirects to `/login` when there's no session — everything under `AppLayout` is nested inside it in `src/App.tsx`. `LoginPage`/`SignupPage` are plain email/password forms. `MissingConfigScreen` renders instead of the whole app (checked via `isSupabaseConfigured` in `src/lib/supabaseClient.ts`) when env vars are missing.

**Data layer** (`src/lib/supabaseResource.ts`): `createResourceHooks<T>(table, scopeColumn = "project_id")` is a factory used once per Supabase table — returns `{ useList(scopeId), useAdd(scopeId), useUpdate(scopeId), useDelete(scopeId) }` built on TanStack Query. Every module's `queries.ts` is just 1-3 lines calling this factory (e.g. `src/features/script/queries.ts` exports `useScenes` and `useCharacters`). Call sites: `useX.useList(projectId).data`, `useX.useAdd(projectId).mutate(itemWithoutId)`, `useX.useUpdate(projectId).mutate({ id, item: partialItem })` (partial updates — Postgres only touches the columns you send), `useX.useDelete(projectId).mutate(id)`. `src/lib/caseMapping.ts` converts camelCase (TS) ⇄ snake_case (Postgres columns) generically, so no per-table field mapping is needed. IDs are still client-generated via `src/lib/id.ts`'s `createId()`.

**Projects** (`src/features/projects/queries.ts`): `projects` table, `owner_id` set at creation (`useAddProject`). `useProjectsList()` is deliberately *unscoped* (`select * from projects`, no client-side `.eq`) — RLS alone decides which rows come back (owned + member-of), which is what makes an invited member's projects appear once they log in. `useActiveProject()` combines that list with `src/store/useProjectStore.ts` (which now holds *only* `activeProjectId`, a client UI preference) and auto-selects the first project once loaded. When a user has zero projects (fresh signup), `DashboardPage` renders `CreateFirstProjectForm` instead of the normal dashboard. `useOwnerProfile(ownerId)` resolves the owner's email (from `profiles`, see below) for display in the Settings roster.

**Permissions & multi-user access** (`src/lib/permissions.ts` + `supabase/schema.sql`): each project has one owner (always full access, role `"admin"`) plus `project_members` rows (`email`, `role`, `userId` nullable). Inviting someone writes a row keyed by `email` with `userId` null; `claim_project_invites()` (a Postgres RPC, `security definer`) links it to `auth.uid()` the moment someone with that email is authenticated — called from `AuthProvider` right after sign-in and on initial session load, which is *why* an invited person sees the project the next time they log in, with no invite-acceptance UI needed. `has_project_access(project_id)` / `project_role(project_id)` are SQL helper functions (also `security definer`, to dodge RLS self-recursion) that every table's RLS policy calls; a member promoted to `role = 'admin'` gets the same management rights as the owner (can invite/edit/remove other members, edit project settings).

The read/write matrix (who can see/edit which table) is defined **twice, deliberately kept in sync by comment cross-reference**: once as the `matrix` jsonb in the `do $$ ... $$` block in `schema.sql` (the actual enforcement — Postgres RLS), and once as `TABLE_ACCESS` in `permissions.ts` (`canReadTable`/`canWriteTable`/`usePermissions`, used to hide nav items and disable "Nuevo X"/edit/delete buttons so a restricted role doesn't hit a raw RLS error). Sidebar visibility (`VISIBLE_ROUTES`) is stricter than table access — e.g. `crew` can read the `actors` table (so a call sheet can show cast names) without ever seeing the Casting *page*. `casting_director`/`crew` never see the Dashboard (most of its data would be empty for them under RLS); `DashboardPage` redirects them to `DEFAULT_ROUTE[role]` instead.

If you change either matrix, change the other to match — nothing enforces they stay identical. When testing this logic without live Supabase credentials, a local Postgres with stubbed `auth.users`/`auth.uid()`/`auth.jwt()`/`storage.*` (session-local `SET request.uid`/`request.email` standing in for the JWT) is enough to exercise real RLS end-to-end — that's how this was verified during development.

**Domain types**: `src/types/index.ts` — every entity (`Scene`, `Character`, `Actor`, `Location`, `ShootDay`, `BudgetItem`, `CallSheet`, `ContinuityEntry`, `PostTask`, `CutVersion`, `DeliveryChecklistItem`, `ProjectMember`, plus `Project`/`Profile` in `projects/queries.ts`) and their label maps. Cross-entity references are plain id fields (`Scene.locationId`, `Actor.characterId`, `ShootDay.sceneIds`); array-typed fields map straight to Postgres array columns (`uuid[]`/`text[]`, see `supabase/schema.sql`) — no join tables.

**Media uploads** (`src/lib/mediaStorage.ts`): `uploadMedia(projectId, file)` uploads to the public `media` Storage bucket under `${projectId}/...` and returns the public URL. Used by `FileField`/`MultiFileField` (`src/components/form/fields.tsx`), which both take a required `projectId` prop and disable the upload control until it's available.

**Shared form building blocks** (`src/components/form/`):
- `fields.tsx` — `TextField`, `NumberField`, `TextareaField`, `SelectField`, `CheckboxField`, `MultiCheckboxField`, `TagsField` (chip input), `DateField` (Popover+Calendar, ISO `yyyy-MM-dd` string), `FileField`/`MultiFileField` (real uploads, see above).
- `DeleteConfirmDialog.tsx` — shared `AlertDialog` wrapper used by every module's delete flow.

**Modules** (`src/features/<name>/`): each follows the same shape — `queries.ts` (Supabase resource hooks), one `*Dialog.tsx` per entity, and a `*Page.tsx` (table/grid + filters + dialogs) wired into `src/App.tsx` inside the `RequireAuth`-guarded route tree. Every list/mutation hook call is scoped by the active project's id, threaded down as a `projectId` prop. Notable cross-module wiring:
- `script` scenes reference `locations` and hold `characterIds`/free-text tag arrays for props/wardrobe/effects/vehicles/extras. Deleting a character also strips it from every scene's `characterIds` (done client-side in `ScriptPage.tsx` as a batch of update mutations before the delete, since there's no DB trigger for it).
- `casting` actors reference `script` characters via `characterId`.
- `schedule` (`ShootDay`) references `script` scenes (`sceneIds`) and a `locations` location; the stripboard (`Stripboard.tsx`) is a multi-container dnd-kit board and the calendar (`CalendarView.tsx`) is FullCalendar `dayGridMonth`. Drag-and-drop commits via `useShootDays.useUpdate(projectId).mutate({ id, item: { sceneIds } })`.
- `callsheets` derives everything (scenes, location, cast) from a `ShootDay` via `buildCallSheetData.ts`, shared by the table view and `CallSheetDocument.tsx` (`@react-pdf/renderer`, rendered client-side with `pdf(...).toBlob()` on demand).
- `dashboard` aggregates `schedule`, `script`, `locations`, `budget`, and `callsheets` queries directly — it's the one page that reads from every other module.
- `settings` edits the active project's general fields (via `useUpdateProject`, admin-only — read-only display for everyone else) plus the `project_members` roster (invite by email, change role, remove — all admin-only; the roster itself is visible to any active member).

## Known limitations (intentional, not oversights)

- **No invite notification email.** Adding someone to `project_members` doesn't send them anything (no email provider wired up, same reason call sheet email is stubbed) — whoever invites them has to tell them out-of-band to sign up/log in with that exact email.
- **A member's role is per-project.** The same person can be `director` on one project and `crew` on another — `useMyRole`/`usePermissions` always take the *active* project, there's no global role.
- **No real map, weather, or email.** Locations link out to Google Maps by URL instead of embedding a map; call sheet weather is a free-text field; call sheet "send by email" is a disabled button with an explanatory tooltip. All three need third-party API keys/accounts that don't exist in this project.
- **Bundle size.** `npm run build` warns about a >2.5MB main chunk (FullCalendar + `@react-pdf/renderer` + Recharts + `@supabase/supabase-js` all ship together). Route-level code-splitting (`React.lazy` per page in `src/App.tsx`) is the fix if this becomes a real problem — not yet done.
