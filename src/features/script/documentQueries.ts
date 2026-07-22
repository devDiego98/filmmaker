import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { JSONContent } from "@tiptap/core"
import { supabase } from "@/lib/supabaseClient"
import { useSession } from "@/features/auth/AuthProvider"
import { EMPTY_SCREENPLAY_DOC } from "./screenplayExtension"

/** One row per project — not a list, so this doesn't go through
 * createResourceHooks (same shape problem useProjectsList solves by hand). */
export function useScriptDocument(projectId: string | undefined) {
  return useQuery({
    queryKey: ["scriptDocument", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("script_document")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle()
      if (error) throw error
      return {
        content: (data?.content as JSONContent | undefined) ?? EMPTY_SCREENPLAY_DOC,
        updatedAt: data?.updated_at as string | undefined,
      }
    },
    enabled: !!projectId,
  })
}

export function useSaveScriptDocument(projectId: string | undefined) {
  const queryClient = useQueryClient()
  const { session } = useSession()

  return useMutation({
    mutationFn: async (content: JSONContent) => {
      if (!projectId) return
      const { error } = await supabase.from("script_document").upsert(
        {
          project_id: projectId,
          content,
          updated_at: new Date().toISOString(),
          updated_by: session?.user.id,
        },
        { onConflict: "project_id" }
      )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scriptDocument", projectId] })
    },
  })
}
