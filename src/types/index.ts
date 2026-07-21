export type SceneColor = "white" | "blue" | "pink" | "yellow"

export const sceneColorLabels: Record<SceneColor, string> = {
  white: "Blanco",
  blue: "Azul",
  pink: "Rosa",
  yellow: "Amarillo",
}

export type Scene = {
  id: string
  number: string
  heading: string
  synopsis?: string
  color: SceneColor
  locationId?: string
  characterIds: string[]
  props: string[]
  wardrobe: string[]
  effects: string[]
  vehicles: string[]
  extras: string[]
  estimatedMinutes?: number
}

export type Character = {
  id: string
  name: string
}

export type CastingStatus = "searching" | "auditioned" | "callback" | "confirmed"

export const castingStatusLabels: Record<CastingStatus, string> = {
  searching: "Buscando",
  auditioned: "Audicionado",
  callback: "Callback",
  confirmed: "Confirmado",
}

export type Actor = {
  id: string
  name: string
  photoUrl?: string
  selfTapeUrl?: string
  contact?: string
  agent?: string
  characterId?: string
  status: CastingStatus
  notes?: string
}

export type LocationStatus = "negotiating" | "confirmed" | "permit_pending"

export const locationStatusLabels: Record<LocationStatus, string> = {
  negotiating: "En negociación",
  confirmed: "Confirmada",
  permit_pending: "Permiso pendiente",
}

export type Location = {
  id: string
  name: string
  address?: string
  status: LocationStatus
  photos: string[]
  notes?: string
}

export type ShootDay = {
  id: string
  date: string
  sceneIds: string[]
  locationId?: string
}

export type BudgetDepartment =
  | "arte"
  | "vestuario"
  | "camara"
  | "sonido"
  | "produccion"
  | "otros"

export const budgetDepartmentLabels: Record<BudgetDepartment, string> = {
  arte: "Arte",
  vestuario: "Vestuario",
  camara: "Cámara",
  sonido: "Sonido",
  produccion: "Producción",
  otros: "Otros",
}

export type BudgetItem = {
  id: string
  department: BudgetDepartment
  description: string
  budgeted: number
  actual: number
}

export type CallSheet = {
  id: string
  shootDayId: string
  date: string
  callTime: string
  weather?: string
  notes?: string
}

export type ContinuityEntry = {
  id: string
  sceneId: string
  takeNumber: number
  duration?: string
  notes?: string
  isCircleTake: boolean
  photos: string[]
}

export type PostTaskStatus = "todo" | "in_progress" | "done"

export const postTaskStatusLabels: Record<PostTaskStatus, string> = {
  todo: "Por hacer",
  in_progress: "En progreso",
  done: "Hecho",
}

export type PostTask = {
  id: string
  title: string
  status: PostTaskStatus
}

export type CutVersion = {
  id: string
  label: string
  date: string
  notes?: string
}

export type DeliveryChecklistItem = {
  id: string
  label: string
  done: boolean
}

export type TeamRole = "admin" | "director" | "casting_director" | "crew"

export const teamRoleLabels: Record<TeamRole, string> = {
  admin: "Admin/Productor",
  director: "Director/1st AD",
  casting_director: "Casting director",
  crew: "Miembro de crew",
}

/** A row in `project_members`: an invite (userId undefined) or an active
 * membership (userId set once the invited email logs in and claims it). */
export type ProjectMember = {
  id: string
  email: string
  userId?: string
  role: TeamRole
}
