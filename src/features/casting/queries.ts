import { createResourceHooks } from "@/lib/supabaseResource"
import type { Actor } from "@/types"

export const useActors = createResourceHooks<Actor>("actors")
