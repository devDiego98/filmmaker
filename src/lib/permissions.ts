import type { TeamRole } from "@/types"
import { useSession } from "@/features/auth/AuthProvider"
import { useProjectMembers, type Project } from "@/features/projects/queries"

export type TableKey =
  | "scenes"
  | "characters"
  | "locations"
  | "actors"
  | "shootDays"
  | "budgetItems"
  | "callSheets"
  | "continuityEntries"
  | "postTasks"
  | "cutVersions"
  | "checklistItems"

type Access = "none" | "read" | "write"

/** Mirrors the `matrix` jsonb in supabase/schema.sql — keep both in sync. */
const TABLE_ACCESS: Record<TableKey, Record<TeamRole, Access>> = {
  scenes: { admin: "write", director: "write", casting_director: "none", crew: "read" },
  characters: { admin: "write", director: "write", casting_director: "read", crew: "read" },
  locations: { admin: "write", director: "write", casting_director: "none", crew: "read" },
  actors: { admin: "write", director: "read", casting_director: "write", crew: "read" },
  shootDays: { admin: "write", director: "write", casting_director: "none", crew: "read" },
  budgetItems: { admin: "write", director: "read", casting_director: "none", crew: "none" },
  callSheets: { admin: "write", director: "write", casting_director: "none", crew: "read" },
  continuityEntries: { admin: "write", director: "write", casting_director: "none", crew: "none" },
  postTasks: { admin: "write", director: "read", casting_director: "none", crew: "none" },
  cutVersions: { admin: "write", director: "read", casting_director: "none", crew: "none" },
  checklistItems: { admin: "write", director: "read", casting_director: "none", crew: "none" },
}

export function canReadTable(role: TeamRole | undefined, table: TableKey): boolean {
  return !!role && TABLE_ACCESS[table][role] !== "none"
}

export function canWriteTable(role: TeamRole | undefined, table: TableKey): boolean {
  return !!role && TABLE_ACCESS[table][role] === "write"
}

/** Managing project_members / editing the project's own name & day count is
 * restricted to the owner (always "admin") or an admin-role member — mirrors
 * the `projects_update` / `project_members_manage` policies in schema.sql. */
export function isAdmin(role: TeamRole | undefined): boolean {
  return role === "admin"
}

/** Sidebar visibility per role — stricter than raw table access. A crew
 * member can read the `actors` table (so a call sheet can show cast names)
 * without ever seeing the Casting *page*, which README scopes to admin/director. */
export const VISIBLE_ROUTES: Record<TeamRole, string[]> = {
  admin: ["/", "/script", "/casting", "/locations", "/schedule", "/budget", "/callsheets", "/continuity", "/post", "/settings"],
  director: ["/", "/script", "/casting", "/locations", "/schedule", "/budget", "/callsheets", "/continuity", "/post", "/settings"],
  casting_director: ["/casting"],
  crew: ["/schedule", "/callsheets"],
}

/** Where "/" should send a role that doesn't see the Dashboard (most of its
 * data would be empty for them under RLS, which would just look broken). */
export const DEFAULT_ROUTE: Record<TeamRole, string> = {
  admin: "/",
  director: "/",
  casting_director: "/casting",
  crew: "/schedule",
}

export function useMyRole(project: Project | undefined): TeamRole | undefined {
  const { session } = useSession()
  const { data: members = [] } = useProjectMembers.useList(project?.id)
  if (!project || !session) return undefined
  if (project.ownerId === session.user.id) return "admin"
  return members.find((m) => m.userId === session.user.id)?.role
}

export function usePermissions(project: Project | undefined) {
  const role = useMyRole(project)
  return {
    role,
    canRead: (table: TableKey) => canReadTable(role, table),
    canWrite: (table: TableKey) => canWriteTable(role, table),
    isAdmin: isAdmin(role),
  }
}
