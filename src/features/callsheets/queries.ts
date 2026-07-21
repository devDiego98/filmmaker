import { createResourceHooks } from "@/lib/supabaseResource"
import type { CallSheet } from "@/types"

export const useCallSheets = createResourceHooks<CallSheet>("call_sheets")
