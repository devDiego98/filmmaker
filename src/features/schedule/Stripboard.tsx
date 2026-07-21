import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { sceneColorLabels, type Location, type Scene, type SceneColor, type ShootDay } from "@/types"
import { formatDateEs } from "@/lib/date"
import { useShootDays } from "./queries"

const UNASSIGNED = "unassigned"

const sceneColorBorder: Record<SceneColor, string> = {
  white: "border-l-neutral-400",
  blue: "border-l-blue-500",
  pink: "border-l-pink-500",
  yellow: "border-l-yellow-500",
}

function SceneStrip({ scene, editable }: { scene: Scene; editable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
    disabled: !editable,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border border-l-4 bg-card p-2 text-sm ${sceneColorBorder[scene.color]}`}
    >
      {editable && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="Reordenar escena"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <span className="font-medium">{scene.number}</span>
      <span className="flex-1 truncate">{scene.heading}</span>
      <Badge variant="outline" className="shrink-0">
        {sceneColorLabels[scene.color]}
      </Badge>
    </div>
  )
}

function Column({
  id,
  title,
  subtitle,
  sceneIds,
  scenesById,
  onEdit,
  emptyLabel,
  editable,
}: {
  id: string
  title: string
  subtitle?: string
  sceneIds: string[]
  scenesById: Map<string, Scene>
  onEdit?: () => void
  emptyLabel: string
  editable: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{title}</div>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {editable && onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Editar
          </Button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-col gap-2 rounded-lg p-1 transition-colors ${isOver ? "bg-accent" : ""}`}
      >
        <SortableContext items={sceneIds} strategy={verticalListSortingStrategy}>
          {sceneIds.map((sceneId) => {
            const scene = scenesById.get(sceneId)
            return scene ? <SceneStrip key={sceneId} scene={scene} editable={editable} /> : null
          })}
        </SortableContext>
        {sceneIds.length === 0 && (
          <p className="p-2 text-center text-xs text-muted-foreground">{emptyLabel}</p>
        )}
      </div>
    </div>
  )
}

type StripboardProps = {
  shootDays: ShootDay[]
  scenes: Scene[]
  locations: Location[]
  onEditDay: (day: ShootDay) => void
  onNewDay: () => void
  projectId: string | undefined
  editable: boolean
}

export function Stripboard({
  shootDays,
  scenes,
  locations,
  onEditDay,
  onNewDay,
  projectId,
  editable,
}: StripboardProps) {
  const updateShootDay = useShootDays.useUpdate(projectId)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const scenesById = useMemo(() => new Map(scenes.map((s) => [s.id, s])), [scenes])
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations])
  const sortedDays = useMemo(
    () => [...shootDays].sort((a, b) => a.date.localeCompare(b.date)),
    [shootDays]
  )

  const containers = useMemo(() => {
    const assigned = new Set(shootDays.flatMap((d) => d.sceneIds))
    const map: Record<string, string[]> = { [UNASSIGNED]: [] }
    for (const day of shootDays) map[day.id] = day.sceneIds
    map[UNASSIGNED] = scenes.filter((s) => !assigned.has(s.id)).map((s) => s.id)
    return map
  }, [shootDays, scenes])

  function findContainer(id: string) {
    if (id in containers) return id
    return Object.keys(containers).find((key) => containers[key].includes(id))
  }

  function commit(containerId: string, sceneIds: string[]) {
    if (containerId === UNASSIGNED) return
    updateShootDay.mutate({ id: containerId, item: { sceneIds } })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const activeContainer = findContainer(active.id as string)
    const overContainer = findContainer(over.id as string)
    if (!activeContainer || !overContainer) return

    if (activeContainer === overContainer) {
      const items = containers[activeContainer]
      const oldIndex = items.indexOf(active.id as string)
      const newIndex = items.indexOf(over.id as string)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        commit(activeContainer, arrayMove(items, oldIndex, newIndex))
      }
      return
    }

    const sourceItems = containers[activeContainer].filter((id) => id !== active.id)
    const destItems = [...containers[overContainer]]
    const overIndex = destItems.indexOf(over.id as string)
    destItems.splice(overIndex >= 0 ? overIndex : destItems.length, 0, active.id as string)
    commit(activeContainer, sourceItems)
    commit(overContainer, destItems)
  }

  const activeScene = activeId ? scenesById.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        <Column
          id={UNASSIGNED}
          title="Sin asignar"
          sceneIds={containers[UNASSIGNED]}
          scenesById={scenesById}
          emptyLabel="Arrastrá escenas acá para desasignarlas."
          editable={editable}
        />
        {sortedDays.map((day) => (
          <Column
            key={day.id}
            id={day.id}
            title={formatDateEs(day.date)}
            subtitle={day.locationId ? locationById.get(day.locationId) : undefined}
            sceneIds={containers[day.id]}
            scenesById={scenesById}
            onEdit={() => onEditDay(day)}
            emptyLabel="Arrastrá escenas acá."
            editable={editable}
          />
        ))}
        {editable && (
          <div className="flex w-72 shrink-0 items-start">
            <Button variant="outline" className="w-full" onClick={onNewDay}>
              <Plus /> Nuevo día
            </Button>
          </div>
        )}
      </div>
      <DragOverlay>
        {activeScene ? <SceneStrip scene={activeScene} editable={editable} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
