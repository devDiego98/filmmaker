import { createResourceHooks } from "@/lib/supabaseResource"
import type { ShootDay } from "@/types"

export const useShootDays = createResourceHooks<ShootDay>("shoot_days")
