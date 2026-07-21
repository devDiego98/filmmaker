import { createResourceHooks } from "@/lib/supabaseResource"
import type { ContinuityEntry } from "@/types"

export const useContinuityEntries = createResourceHooks<ContinuityEntry>("continuity_entries")
