import { createResourceHooks } from "@/lib/supabaseResource"
import type { CutVersion, DeliveryChecklistItem, PostTask } from "@/types"

export const usePostTasks = createResourceHooks<PostTask>("post_tasks")
export const useCutVersions = createResourceHooks<CutVersion>("cut_versions")
export const useChecklistItems = createResourceHooks<DeliveryChecklistItem>("checklist_items")
