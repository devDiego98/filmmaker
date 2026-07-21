import { createResourceHooks } from "@/lib/supabaseResource"
import type { Location } from "@/types"

export const useLocations = createResourceHooks<Location>("locations")
