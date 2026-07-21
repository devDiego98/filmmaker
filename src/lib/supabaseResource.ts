import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "./supabaseClient"
import { camelToSnake, snakeToCamel } from "./caseMapping"
import { createId } from "./id"

type WithId = { id: string }

/**
 * CRUD hooks for a Supabase table scoped by a parent id column (usually
 * `project_id`). Every module's table shares this exact shape, so the
 * factory is used once per table instead of hand-writing the same
 * query/mutation boilerplate in every feature.
 *
 * `TScopeKey` is only needed when the scope column also exists as a field
 * on `T` (e.g. `projects` scoped by `owner_id` -> `ownerId`) — it excludes
 * that field from `useAdd`'s payload, since it's filled in from `scopeId`
 * automatically. Domain tables scoped by `project_id` (which isn't part of
 * their TS type at all) don't need to pass this.
 */
export function createResourceHooks<T extends WithId, TScopeKey extends keyof T = never>(
  table: string,
  scopeColumn: string = "project_id"
) {
  function useList(scopeId: string | undefined) {
    return useQuery({
      queryKey: [table, scopeId],
      queryFn: async () => {
        const { data, error } = await supabase.from(table).select("*").eq(scopeColumn, scopeId)
        if (error) throw error
        return (data ?? []).map((row) => snakeToCamel<T>(row))
      },
      enabled: !!scopeId,
    })
  }

  function useAdd(scopeId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (item: Omit<T, "id" | TScopeKey>) => {
        const row = camelToSnake({
          ...item,
          id: createId(),
          [scopeColumn]: scopeId,
        } as Record<string, unknown>)
        const { error } = await supabase.from(table).insert(row)
        if (error) throw error
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [table, scopeId] }),
    })
  }

  function useUpdate(scopeId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async ({ id, item }: { id: string; item: Partial<Omit<T, "id">> }) => {
        const row = camelToSnake(item as Record<string, unknown>)
        const { error } = await supabase.from(table).update(row).eq("id", id)
        if (error) throw error
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [table, scopeId] }),
    })
  }

  function useDelete(scopeId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(table).delete().eq("id", id)
        if (error) throw error
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [table, scopeId] }),
    })
  }

  return { useList, useAdd, useUpdate, useDelete }
}
