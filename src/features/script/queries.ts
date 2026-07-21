import { createResourceHooks } from "@/lib/supabaseResource"
import type { Character, Scene } from "@/types"

export const useScenes = createResourceHooks<Scene>("scenes")
export const useCharacters = createResourceHooks<Character>("characters")
