import { useMemo, useState } from "react"
import { Pencil, Plus, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import type { ContinuityEntry } from "@/types"
import { useScenes } from "@/features/script/queries"
import { useActiveProject } from "@/features/projects/queries"
import { usePermissions } from "@/lib/permissions"
import { useContinuityEntries } from "./queries"
import { ContinuityEntryDialog } from "./ContinuityEntryDialog"

const ALL = "all"

export function ContinuityPage() {
  const { project } = useActiveProject()
  const projectId = project?.id
  const { data: entries = [] } = useContinuityEntries.useList(projectId)
  const deleteEntryMutation = useContinuityEntries.useDelete(projectId)
  const { data: scenes = [] } = useScenes.useList(projectId)
  const { canWrite } = usePermissions(project)

  const [sceneFilter, setSceneFilter] = useState(ALL)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ContinuityEntry | undefined>()
  const [deletingEntry, setDeletingEntry] = useState<ContinuityEntry | undefined>()

  const sceneById = useMemo(() => new Map(scenes.map((s) => [s.id, s])), [scenes])

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => sceneFilter === ALL || e.sceneId === sceneFilter)
      .sort((a, b) => {
        const sceneCompare = (sceneById.get(a.sceneId)?.number ?? "").localeCompare(
          sceneById.get(b.sceneId)?.number ?? ""
        )
        return sceneCompare !== 0 ? sceneCompare : a.takeNumber - b.takeNumber
      })
  }, [entries, sceneFilter, sceneById])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={sceneFilter} onValueChange={setSceneFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Escena" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las escenas</SelectItem>
            {scenes.map((scene) => (
              <SelectItem key={scene.id} value={scene.id}>
                {scene.number}. {scene.heading}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canWrite("continuityEntries") && (
          <Button
            className="ml-auto"
            onClick={() => {
              setEditingEntry(undefined)
              setDialogOpen(true)
            }}
            disabled={scenes.length === 0}
          >
            <Plus /> Nueva toma
          </Button>
        )}
      </div>

      {canWrite("continuityEntries") && scenes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Primero cargá escenas en Guion para poder registrar tomas.
        </p>
      )}

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Escena</TableHead>
              <TableHead className="w-16">Toma</TableHead>
              <TableHead className="w-24">Duración</TableHead>
              <TableHead className="w-16">Circle</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="w-16">Fotos</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.map((entry) => {
              const scene = sceneById.get(entry.sceneId)
              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {scene ? `${scene.number}. ${scene.heading}` : "?"}
                  </TableCell>
                  <TableCell>{entry.takeNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.duration ?? "—"}
                  </TableCell>
                  <TableCell>
                    {entry.isCircleTake && (
                      <Star className="size-4 fill-yellow-400 text-yellow-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{entry.notes ?? "—"}</TableCell>
                  <TableCell>
                    {entry.photos.length > 0 && (
                      <Badge variant="secondary">{entry.photos.length}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite("continuityEntries") && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar toma"
                          onClick={() => {
                            setEditingEntry(entry)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar toma"
                          onClick={() => setDeletingEntry(entry)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {filteredEntries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No hay tomas registradas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ContinuityEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editingEntry}
        scenes={scenes}
        projectId={projectId}
      />
      <DeleteConfirmDialog
        open={!!deletingEntry}
        onOpenChange={(open) => !open && setDeletingEntry(undefined)}
        title="Eliminar toma"
        description="¿Seguro que querés eliminar este registro de continuidad? Esta acción no se puede deshacer."
        onConfirm={() => {
          if (deletingEntry) deleteEntryMutation.mutate(deletingEntry.id)
          setDeletingEntry(undefined)
        }}
      />
    </div>
  )
}
