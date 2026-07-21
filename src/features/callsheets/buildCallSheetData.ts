import type { Actor, CallSheet, Character, Location, Scene, ShootDay } from "@/types"

export type CallSheetCastRow = {
  characterName: string
  actorName: string
  contact?: string
}

export type CallSheetData = {
  callSheet: CallSheet
  shootDay?: ShootDay
  location?: Location
  scenes: Scene[]
  cast: CallSheetCastRow[]
}

export function buildCallSheetData(
  callSheet: CallSheet,
  shootDays: ShootDay[],
  scenes: Scene[],
  locations: Location[],
  characters: Character[],
  actors: Actor[]
): CallSheetData {
  const shootDay = shootDays.find((d) => d.id === callSheet.shootDayId)
  const dayScenes = shootDay ? scenes.filter((s) => shootDay.sceneIds.includes(s.id)) : []
  const location = shootDay?.locationId
    ? locations.find((l) => l.id === shootDay.locationId)
    : undefined

  const characterIds = new Set(dayScenes.flatMap((s) => s.characterIds))
  const cast: CallSheetCastRow[] = [...characterIds].map((characterId) => {
    const character = characters.find((c) => c.id === characterId)
    const actor = actors.find((a) => a.characterId === characterId)
    return {
      characterName: character?.name ?? "?",
      actorName: actor?.name ?? "Sin confirmar",
      contact: actor?.contact,
    }
  })

  return { callSheet, shootDay, location, scenes: dayScenes, cast }
}
