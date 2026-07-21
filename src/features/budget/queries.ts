import { createResourceHooks } from "@/lib/supabaseResource"
import type { BudgetItem } from "@/types"

export const useBudgetItems = createResourceHooks<BudgetItem>("budget_items")
