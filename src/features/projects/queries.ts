import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { createResourceHooks } from "@/lib/supabaseResource"
import { supabase } from "@/lib/supabaseClient"
import { snakeToCamel } from "@/lib/caseMapping"
import { useSession } from "@/features/auth/AuthProvider"
import { useProjectStore } from "@/store/useProjectStore"
import type { ProjectMember } from "@/types"

export type Project = {
  id: string
  ownerId: string
  name: string
  currentShootDay: number
  totalShootDays: number
}

const projectHooks = createResourceHooks<Project, "ownerId">("projects", "owner_id")

export const useProjectMembers = createResourceHooks<ProjectMember>("project_members")

export type Profile = { id: string; email: string }

/** `profiles` mirrors auth.users(id, email) — see supabase/schema.sql. Used
 * to show the project owner's email in the Settings roster (project_members
 * rows already carry their own `email` column for display). */
const profileHooks = createResourceHooks<Profile>("profiles", "id")

export function useOwnerProfile(ownerId: string | undefined) {
  const { data } = profileHooks.useList(ownerId)
  return data?.[0]
}

/** Unscoped on purpose: RLS on `projects` returns owned + member-of rows, so
 * the client doesn't filter by owner_id here — that's what makes an invited
 * member's projects show up once they log in. The query key still includes
 * the user id so `useAddProject`/`useUpdateProject`'s invalidation (which
 * targets `["projects", ownerId]`) refreshes this list after a write. */
export function useProjectsList() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ["projects", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*")
      if (error) throw error
      return (data ?? []).map((row) => snakeToCamel<Project>(row))
    },
    enabled: !!userId,
  })
}

export function useAddProject() {
  const { session } = useSession()
  return projectHooks.useAdd(session?.user.id)
}

export function useUpdateProject() {
  const { session } = useSession()
  return projectHooks.useUpdate(session?.user.id)
}

/** Resolves the selected project, defaulting to the first one once the list loads. */
export function useActiveProject() {
  const { data: projects = [], isLoading } = useProjectsList()
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)

  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      setActiveProject(projects[0].id)
    }
  }, [activeProjectId, projects, setActiveProject])

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0]
  return { project: activeProject, projects, isLoading }
}
