import { create } from "zustand"
import { persist } from "zustand/middleware"

type ProjectSelectionStore = {
  activeProjectId: string | undefined
  setActiveProject: (id: string) => void
}

/** Only the "which project is currently selected" UI preference — the actual
 * project data lives in Supabase, see `src/features/projects/queries.ts`. */
export const useProjectStore = create<ProjectSelectionStore>()(
  persist(
    (set) => ({
      activeProjectId: undefined,
      setActiveProject: (id) => set({ activeProjectId: id }),
    }),
    { name: "filmmaker-active-project" }
  )
)
