import { useMemo, useState } from "react"
import { Pencil, Plus, Trash2, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeleteConfirmDialog } from "@/components/form/DeleteConfirmDialog"
import { castingStatusLabels, type Actor, type CastingStatus } from "@/types"
import { useCharacters } from "@/features/script/queries"
import { useActiveProject } from "@/features/projects/queries"
import { usePermissions } from "@/lib/permissions"
import { useActors } from "./queries"
import { ActorDialog } from "./ActorDialog"

const statusBadgeClasses: Record<CastingStatus, string> = {
  searching: "bg-neutral-100 text-neutral-700 border-neutral-300",
  auditioned: "bg-blue-100 text-blue-900 border-blue-300",
  callback: "bg-yellow-100 text-yellow-900 border-yellow-300",
  confirmed: "bg-green-100 text-green-900 border-green-300",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function CastingPage() {
  const { project } = useActiveProject()
  const projectId = project?.id
  const { data: actors = [] } = useActors.useList(projectId)
  const deleteActorMutation = useActors.useDelete(projectId)
  const { data: characters = [] } = useCharacters.useList(projectId)
  const { canWrite } = usePermissions(project)

  const [statusFilter, setStatusFilter] = useState<CastingStatus | "all">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActor, setEditingActor] = useState<Actor | undefined>()
  const [deletingActor, setDeletingActor] = useState<Actor | undefined>()

  const characterById = useMemo(
    () => new Map(characters.map((c) => [c.id, c.name])),
    [characters]
  )

  const filteredActors = useMemo(
    () => actors.filter((a) => statusFilter === "all" || a.status === statusFilter),
    [actors, statusFilter]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(castingStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canWrite("actors") && (
          <Button
            className="ml-auto"
            onClick={() => {
              setEditingActor(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus /> Nuevo actor
          </Button>
        )}
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Nombre</TableHead>
              <TableHead>Personaje</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead className="w-12">Self-tape</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredActors.map((actor) => (
              <TableRow key={actor.id}>
                <TableCell>
                  <Avatar className="size-8">
                    <AvatarImage src={actor.photoUrl} alt={actor.name} />
                    <AvatarFallback>{initials(actor.name)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{actor.name}</TableCell>
                <TableCell>
                  {actor.characterId ? (
                    <Badge variant="secondary">{characterById.get(actor.characterId)}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={statusBadgeClasses[actor.status]} variant="outline">
                    {castingStatusLabels[actor.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{actor.contact ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{actor.agent ?? "—"}</TableCell>
                <TableCell>
                  {actor.selfTapeUrl && <Video className="size-4 text-muted-foreground" />}
                </TableCell>
                <TableCell>
                  {canWrite("actors") && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar actor"
                        onClick={() => {
                          setEditingActor(actor)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar actor"
                        onClick={() => setDeletingActor(actor)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredActors.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No hay actores que coincidan con el filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ActorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        actor={editingActor}
        characters={characters}
        projectId={projectId}
      />
      <DeleteConfirmDialog
        open={!!deletingActor}
        onOpenChange={(open) => !open && setDeletingActor(undefined)}
        title="Eliminar actor"
        description={`¿Seguro que querés eliminar a "${deletingActor?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (deletingActor) deleteActorMutation.mutate(deletingActor.id)
          setDeletingActor(undefined)
        }}
      />
    </div>
  )
}
