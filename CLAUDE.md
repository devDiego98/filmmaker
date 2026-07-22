# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

FILMMAKER is a web platform for managing pre-production, production, and post-production of a film or short film. All 10 modules from the product spec are implemented with real CRUD functionality, backed by Supabase (Postgres + Auth + Storage) with email/password login. Projects support real multi-user collaboration: the owner can invite people by email and assign one of the 4 README roles, enforced by Postgres RLS (not just hidden UI). The Script module additionally has a full industry-format screenplay editor with an AI writing assistant (Groq, proxied through a Supabase Edge Function) — see "Screenplay editor & AI assistant" below. `README.md` (product spec) and `TECH.md` (original stack proposal) are in Spanish and remain the source of truth for planned scope beyond what's built.

## Supabase setup (required to run the app)

The app renders a "Falta configurar Supabase" screen instead of crashing when unconfigured — that screen has the up-to-date steps. Summary:

1. Create a free project at supabase.com.
2. Run `supabase/schema.sql` (paste it into the project's SQL Editor) — creates every table, RLS policy, and the `media` storage bucket/policies in one shot. Safe to re-run.
3. Copy `.env.local.example` to `.env.local` and fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from Settings → API.
4. Restart `npm run dev`.

I (Claude) cannot create the Supabase account/project or obtain these credentials — that's a manual step for whoever is running this. I can't end-to-end test the real hosted project (real signup emails, the actual dashboard, etc.), but the RLS/permissions logic in `schema.sql` itself has been exercised against a local Postgres with stubbed `auth`/`storage` schemas (see the permissions section below) — that part is verified, not just reviewed by eye. What's still untested is everything above the database: real auth signup/login, and the UI against real data.

### AI screenplay assistant setup (separate, additional step)

The document editor itself (writing, saving, PDF/Word export) works as soon as the steps above are done. The **chat panel** needs one more piece — a deployed Supabase Edge Function holding a Groq API key server-side (never in the browser):

1. Get an API key at console.groq.com.
2. Install the Supabase CLI, then from the repo root: `supabase login`, `supabase link` (pick this project).
3. `supabase functions deploy script-assistant`
4. `supabase secrets set GROQ_API_KEY=gsk_...`

Until this is done, the chat panel will show a connection-error message when a message is sent — the rest of the app is unaffected.

### Invite emails setup (separate, additional step)

Inviting an existing user already works with zero setup (RLS + `claim_project_invites()`, see Permissions below). To actually email someone who has **no account yet** a link to create one and land on the project, deploy one more Edge Function — no new secret needed, `SUPABASE_SERVICE_ROLE_KEY` is auto-injected into every Edge Function:

1. `supabase functions deploy invite-member`
2. In the Supabase dashboard → Authentication → URL Configuration → Redirect URLs, add `http://localhost:5173/invite` (dev) and `https://<your-prod-domain>/invite` (once hosted) — Supabase rejects `redirectTo` values that aren't on this list.

Supabase's default/shared email sending has a low rate limit (a handful of emails/hour) — fine for testing, but configure custom SMTP (Authentication → SMTP Settings) before relying on this for a real team. Until the function is deployed, inviting a brand-new email still adds them to the project (they just won't get an email — same as before).

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

**Auth** (`src/features/auth/`): `AuthProvider`/`useSession()` wraps `supabase.auth` session state in React Context. `RequireAuth` is a layout route that redirects to `/login` when there's no session — everything under `AppLayout` is nested inside it in `src/App.tsx`. `LoginPage`/`SignupPage` are plain email/password forms. `AcceptInvitePage` (`/invite`, outside `RequireAuth`) is where a brand-new invitee lands from their invite email — see "Invite emails" under Permissions below. `MissingConfigScreen` renders instead of the whole app (checked via `isSupabaseConfigured` in `src/lib/supabaseClient.ts`) when env vars are missing.

**Data layer** (`src/lib/supabaseResource.ts`): `createResourceHooks<T>(table, scopeColumn = "project_id")` is a factory used once per Supabase table — returns `{ useList(scopeId), useAdd(scopeId), useUpdate(scopeId), useDelete(scopeId) }` built on TanStack Query. Every module's `queries.ts` is just 1-3 lines calling this factory (e.g. `src/features/script/queries.ts` exports `useScenes` and `useCharacters`). Call sites: `useX.useList(projectId).data`, `useX.useAdd(projectId).mutate(itemWithoutId)`, `useX.useUpdate(projectId).mutate({ id, item: partialItem })` (partial updates — Postgres only touches the columns you send), `useX.useDelete(projectId).mutate(id)`. `src/lib/caseMapping.ts` converts camelCase (TS) ⇄ snake_case (Postgres columns) generically, so no per-table field mapping is needed. IDs are still client-generated via `src/lib/id.ts`'s `createId()`.

**Projects** (`src/features/projects/queries.ts`): `projects` table, `owner_id` set at creation (`useAddProject`). `useProjectsList()` is deliberately *unscoped* (`select * from projects`, no client-side `.eq`) — RLS alone decides which rows come back (owned + member-of), which is what makes an invited member's projects appear once they log in. `useActiveProject()` combines that list with `src/store/useProjectStore.ts` (which now holds *only* `activeProjectId`, a client UI preference) and auto-selects the first project once loaded. When a user has zero projects (fresh signup), `DashboardPage` renders `CreateFirstProjectForm` instead of the normal dashboard. `useOwnerProfile(ownerId)` resolves the owner's email (from `profiles`, see below) for display in the Settings roster.

**Permissions & multi-user access** (`src/lib/permissions.ts` + `supabase/schema.sql`): each project has one owner (always full access, role `"admin"`) plus `project_members` rows (`email`, `role`, `userId` nullable). Inviting someone writes a row keyed by `email` with `userId` null; `claim_project_invites()` (a Postgres RPC, `security definer`) links it to `auth.uid()` the moment someone with that email is authenticated — called from `AuthProvider` right after sign-in and on initial session load, which is *why* an invited person sees the project the next time they log in, with no invite-acceptance UI needed. `has_project_access(project_id)` / `project_role(project_id)` are SQL helper functions (also `security definer`, to dodge RLS self-recursion) that every table's RLS policy calls; a member promoted to `role = 'admin'` gets the same management rights as the owner (can invite/edit/remove other members, edit project settings).

**Invite emails** (`MemberDialog.tsx` + `supabase/functions/invite-member/index.ts`): inviting someone who already has an account needs nothing further — they see the project on their next login via the claim flow above. For someone with no account, `MemberDialog` additionally calls the `invite-member` Edge Function (after the `project_members` insert; a soft failure here doesn't undo that insert), which re-checks the caller is `project_role(projectId) === "admin"` (required — a service-role call bypasses RLS entirely, so this is the only gate) and then calls `supabase.auth.admin.inviteUserByEmail(email, {redirectTo})` with a service-role client. That both creates the `auth.users` row (the existing `handle_new_user` trigger populates `profiles` as usual) and emails a link. Supabase reporting the email as already-registered is treated as success, not an error — that's the "existing account" path, handled entirely by the claim flow, no email needed. Clicking the emailed link lands on `/invite` with auth tokens in the URL hash; `supabase-js`'s default `detectSessionInUrl` parses them and establishes a session automatically, which means `claim_project_invites()` (fired by `AuthProvider` on any new session) links the project *before* the user even sets a password. `AcceptInvitePage` then just asks for a password (`supabase.auth.updateUser({password})`) and sends them to `/`.

The read/write matrix (who can see/edit which table) is defined **twice, deliberately kept in sync by comment cross-reference**: once as the `matrix` jsonb in the `do $$ ... $$` block in `schema.sql` (the actual enforcement — Postgres RLS), and once as `TABLE_ACCESS` in `permissions.ts` (`canReadTable`/`canWriteTable`/`usePermissions`, used to hide nav items and disable "Nuevo X"/edit/delete buttons so a restricted role doesn't hit a raw RLS error). Sidebar visibility (`VISIBLE_ROUTES`) is stricter than table access — e.g. `crew` can read the `actors` table (so a call sheet can show cast names) without ever seeing the Casting *page*. `casting_director`/`crew` never see the Dashboard (most of its data would be empty for them under RLS); `DashboardPage` redirects them to `DEFAULT_ROUTE[role]` instead.

If you change either matrix, change the other to match — nothing enforces they stay identical. When testing this logic without live Supabase credentials, a local Postgres with stubbed `auth.users`/`auth.uid()`/`auth.jwt()`/`storage.*` (session-local `SET request.uid`/`request.email` standing in for the JWT) is enough to exercise real RLS end-to-end — that's how this was verified during development.

**Screenplay editor & AI assistant** (`src/features/script/`, "Guion" tab — separate from the scene/character breakdown tab): a real prose screenplay document, one per project, stored as Tiptap JSON in the `script_document` table (`project_id` primary key, same read/write tier as `scenes` in both matrices — see Permissions above).
- `screenplayExtension.ts` defines `ScreenplayElement`, the sole block-level Tiptap node (replaces StarterKit's paragraph/heading). Every line is this node distinguished only by an `elementType` attribute (`sceneHeading | action | character | parenthetical | dialogue | transition`); formatting (indentation, caps, alignment, monospace) is CSS-only via a `data-element-type` attribute, so nothing mutates the underlying text. Enter key auto-continues to the next logical element type (character→dialogue, dialogue→action, etc.), `Mod-1`..`Mod-6` jump directly to a type — a simplified version of Final Draft's tab/enter cycling that doesn't hijack the Tab key.
- `documentQueries.ts` (`useScriptDocument`/`useSaveScriptDocument`) is hand-written, not `createResourceHooks` — this is a single row keyed by `project_id`, not a list keyed by `id`. `ScriptDocumentEditor.tsx` debounces autosave (~1.5s after the last keystroke).
- `docConversion.ts`'s `docToLines`/`extractPlainText` flatten the Tiptap JSON into per-element lines, shared by the AI context, the PDF export (`ScriptDocumentPdf.tsx`, `@react-pdf/renderer`, same `pdf(...).toBlob()` pattern as `CallSheetDocument.tsx`), and the Word export (`exportScriptToDocx.ts`, the `docx` package, `Packer.toBlob(...)`). PDF download requires `scriptDocument` read access; Word download requires write access (matches the editor's own format, per spec).
- **AI chat** (`ScriptChatPanel.tsx`) calls `supabase.functions.invoke("script-assistant", ...)` — a Supabase Edge Function (`supabase/functions/script-assistant/index.ts`, Deno, Groq's OpenAI-compatible `groq-sdk`) that holds the Groq API key as a server secret (never sent to the browser) and re-checks the caller's `project_role` via RPC before spending tokens (defense-in-depth on top of the client hiding the panel for roles without read access). The model (`openai/gpt-oss-120b` — change the `MODEL` constant in `index.ts` to swap it) is asked for a JSON response (`response_format: {type: "json_object"}` plus the exact shape spelled out in the system prompt, since Groq has no native schema-constrained output like Anthropic's `output_config.format` — both the edge function and the client defensively validate the parsed shape rather than trusting it) of `{reply, suggestedEdits[]}` so suggested changes are diffable, not just prose. Each `suggestedEdits[]` entry is `{originalText, lines[], explanation}` — `lines` is the proposed content as properly-typed screenplay elements (`{elementType, text}`), not a flat string, so a whole AI-written scene comes back with correct scene-heading/character/dialogue structure; `originalText` is an exact quoted excerpt to replace, or `""` when the AI is proposing brand-new content to append (e.g. writing a scene from scratch on an empty document) rather than replacing anything. Accepting a non-empty-`originalText` edit calls `docConversion.ts`'s `findTextRange`, which searches the same newline-per-element text the model was given as context and maps a match back to a ProseMirror position range **even when it spans multiple elements** (a plain per-text-node search isn't enough — an AI-proposed quote routinely covers several screenplay lines at once), then applies via `editor.chain().insertContentAt(range, linesToContent(edit.lines))`. If the excerpt can't be found (doc changed since the suggestion was generated, or the model didn't quote verbatim), the card shows "no se pudo aplicar" instead of guessing. A non-empty editor selection is sent as `selectedText`, which the system prompt tells the model to scope suggestions to. Chat history is React state only — not persisted across reloads.

**Domain types**: `src/types/index.ts` — every entity (`Scene`, `Character`, `Actor`, `Location`, `ShootDay`, `BudgetItem`, `CallSheet`, `ContinuityEntry`, `PostTask`, `CutVersion`, `DeliveryChecklistItem`, `ProjectMember`, plus `Project`/`Profile` in `projects/queries.ts`) and their label maps. Cross-entity references are plain id fields (`Scene.locationId`, `Actor.characterId`, `ShootDay.sceneIds`); array-typed fields map straight to Postgres array columns (`uuid[]`/`text[]`, see `supabase/schema.sql`) — no join tables.

**Media uploads** (`src/lib/mediaStorage.ts`): `uploadMedia(projectId, file)` uploads to the public `media` Storage bucket under `${projectId}/...` and returns the public URL. Used by `FileField`/`MultiFileField` (`src/components/form/fields.tsx`), which both take a required `projectId` prop and disable the upload control until it's available.

**Shared form building blocks** (`src/components/form/`):
- `fields.tsx` — `TextField`, `NumberField`, `TextareaField`, `SelectField`, `CheckboxField`, `MultiCheckboxField`, `TagsField` (chip input), `DateField` (Popover+Calendar, ISO `yyyy-MM-dd` string), `FileField`/`MultiFileField` (real uploads, see above).
- `DeleteConfirmDialog.tsx` — shared `AlertDialog` wrapper used by every module's delete flow.

**Modules** (`src/features/<name>/`): each follows the same shape — `queries.ts` (Supabase resource hooks), one `*Dialog.tsx` per entity, and a `*Page.tsx` (table/grid + filters + dialogs) wired into `src/App.tsx` inside the `RequireAuth`-guarded route tree. Every list/mutation hook call is scoped by the active project's id, threaded down as a `projectId` prop. Notable cross-module wiring:
- `script` has three tabs: the prose screenplay editor ("Guion" — see "Screenplay editor & AI assistant" above), and the scene/character breakdown (scenes reference `locations` and hold `characterIds`/free-text tag arrays for props/wardrobe/effects/vehicles/extras — a separate, unrelated data model from the prose document). Deleting a character also strips it from every scene's `characterIds` (done client-side in `ScriptPage.tsx` as a batch of update mutations before the delete, since there's no DB trigger for it).
- `casting` actors reference `script` characters via `characterId`.
- `schedule` (`ShootDay`) references `script` scenes (`sceneIds`) and a `locations` location; the stripboard (`Stripboard.tsx`) is a multi-container dnd-kit board and the calendar (`CalendarView.tsx`) is FullCalendar `dayGridMonth`. Drag-and-drop commits via `useShootDays.useUpdate(projectId).mutate({ id, item: { sceneIds } })`.
- `callsheets` derives everything (scenes, location, cast) from a `ShootDay` via `buildCallSheetData.ts`, shared by the table view and `CallSheetDocument.tsx` (`@react-pdf/renderer`, rendered client-side with `pdf(...).toBlob()` on demand).
- `dashboard` aggregates `schedule`, `script`, `locations`, `budget`, and `callsheets` queries directly — it's the one page that reads from every other module.
- `settings` edits the active project's general fields (via `useUpdateProject`, admin-only — read-only display for everyone else) plus the `project_members` roster (invite by email, change role, remove — all admin-only; the roster itself is visible to any active member).

## Known limitations (intentional, not oversights)

- **A member's role is per-project.** The same person can be `director` on one project and `crew` on another — `useMyRole`/`usePermissions` always take the *active* project, there's no global role.
- **No real map, weather, or email.** Locations link out to Google Maps by URL instead of embedding a map; call sheet weather is a free-text field; call sheet "send by email" is a disabled button with an explanatory tooltip. All three need third-party API keys/accounts that don't exist in this project.
- **Bundle size.** `npm run build` warns about a >3.5MB main chunk (FullCalendar + `@react-pdf/renderer` + Recharts + Tiptap + `docx` + `@supabase/supabase-js` all ship together). Route-level code-splitting (`React.lazy` per page in `src/App.tsx`) is the fix if this becomes a real problem — not yet done.
- **Screenplay chat has no memory across reloads.** `ScriptChatPanel`'s conversation is React state only; refreshing the page loses it. The document itself (the thing that matters) is persisted.
- **AI suggestion matching requires an exact quote.** `findTextRange` locates a suggested edit's quoted excerpt across the whole document (it can span multiple screenplay elements), but the excerpt must match verbatim — if the model paraphrases instead of quoting, or the doc changed since the suggestion was generated, the card shows "no se pudo aplicar" and the user edits manually.
