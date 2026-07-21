import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeleteConfirmDialog } from "@/components/form/DeleteConfirmDialog"
import { postTaskStatusLabels, type CutVersion, type PostTask, type PostTaskStatus } from "@/types"
import { formatDateEs } from "@/lib/date"
import { useActiveProject } from "@/features/projects/queries"
import { usePermissions } from "@/lib/permissions"
import { usePostTasks, useCutVersions, useChecklistItems } from "./queries"
import { TaskDialog } from "./TaskDialog"
import { CutVersionDialog } from "./CutVersionDialog"

const statusBadgeClasses: Record<PostTaskStatus, string> = {
  todo: "bg-neutral-100 text-neutral-700 border-neutral-300",
  in_progress: "bg-blue-100 text-blue-900 border-blue-300",
  done: "bg-green-100 text-green-900 border-green-300",
}

export function PostProductionPage() {
  const { project } = useActiveProject()
  const projectId = project?.id
  const { data: tasks = [] } = usePostTasks.useList(projectId)
  const deleteTaskMutation = usePostTasks.useDelete(projectId)
  const { data: cutVersions = [] } = useCutVersions.useList(projectId)
  const deleteCutVersionMutation = useCutVersions.useDelete(projectId)
  const { data: checklist = [] } = useChecklistItems.useList(projectId)
  const addChecklistItemMutation = useChecklistItems.useAdd(projectId)
  const updateChecklistItemMutation = useChecklistItems.useUpdate(projectId)
  const deleteChecklistItemMutation = useChecklistItems.useDelete(projectId)
  const { canWrite } = usePermissions(project)

  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<PostTask | undefined>()
  const [deletingTask, setDeletingTask] = useState<PostTask | undefined>()

  const [cutDialogOpen, setCutDialogOpen] = useState(false)
  const [editingCut, setEditingCut] = useState<CutVersion | undefined>()
  const [deletingCut, setDeletingCut] = useState<CutVersion | undefined>()

  const [newChecklistLabel, setNewChecklistLabel] = useState("")
  const doneCount = checklist.filter((c) => c.done).length

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="cuts">Cortes</TabsTrigger>
          <TabsTrigger value="checklist">Checklist de entrega</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="flex flex-col gap-4">
          {canWrite("postTasks") && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditingTask(undefined)
                  setTaskDialogOpen(true)
                }}
              >
                <Plus /> Nueva tarea
              </Button>
            </div>
          )}
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead className="w-40">Estado</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClasses[task.status]} variant="outline">
                        {postTaskStatusLabels[task.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite("postTasks") && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar tarea"
                            onClick={() => {
                              setEditingTask(task)
                              setTaskDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Eliminar tarea"
                            onClick={() => setDeletingTask(task)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      Todavía no hay tareas de edición.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="cuts" className="flex flex-col gap-4">
          {canWrite("cutVersions") && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditingCut(undefined)
                  setCutDialogOpen(true)
                }}
              >
                <Plus /> Nuevo corte
              </Button>
            </div>
          )}
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versión</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...cutVersions]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((cut) => (
                    <TableRow key={cut.id}>
                      <TableCell className="font-medium">{cut.label}</TableCell>
                      <TableCell>{formatDateEs(cut.date)}</TableCell>
                      <TableCell className="text-muted-foreground">{cut.notes ?? "—"}</TableCell>
                      <TableCell>
                        {canWrite("cutVersions") && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Editar corte"
                              onClick={() => {
                                setEditingCut(cut)
                                setCutDialogOpen(true)
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Eliminar corte"
                              onClick={() => setDeletingCut(cut)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                {cutVersions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Todavía no hay versiones de corte.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="checklist" className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {doneCount} de {checklist.length} completado
          </p>
          <div className="flex flex-col gap-2 rounded-xl border p-3">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted/50">
                <Checkbox
                  checked={item.done}
                  disabled={!canWrite("checklistItems")}
                  onCheckedChange={() =>
                    updateChecklistItemMutation.mutate({ id: item.id, item: { done: !item.done } })
                  }
                />
                <span className={`flex-1 text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}>
                  {item.label}
                </span>
                {canWrite("checklistItems") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar ítem"
                    onClick={() => deleteChecklistItemMutation.mutate(item.id)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
            {checklist.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay ítems en el checklist.
              </p>
            )}
          </div>
          {canWrite("checklistItems") && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const label = newChecklistLabel.trim()
                if (label) {
                  addChecklistItemMutation.mutate({ label, done: false })
                  setNewChecklistLabel("")
                }
              }}
            >
              <Input
                placeholder="Agregar ítem al checklist..."
                value={newChecklistLabel}
                onChange={(e) => setNewChecklistLabel(e.target.value)}
              />
              <Button type="submit">
                <Plus /> Agregar
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        projectId={projectId}
      />
      <DeleteConfirmDialog
        open={!!deletingTask}
        onOpenChange={(open) => !open && setDeletingTask(undefined)}
        title="Eliminar tarea"
        description={`¿Seguro que querés eliminar "${deletingTask?.title}"?`}
        onConfirm={() => {
          if (deletingTask) deleteTaskMutation.mutate(deletingTask.id)
          setDeletingTask(undefined)
        }}
      />

      <CutVersionDialog
        open={cutDialogOpen}
        onOpenChange={setCutDialogOpen}
        cutVersion={editingCut}
        projectId={projectId}
      />
      <DeleteConfirmDialog
        open={!!deletingCut}
        onOpenChange={(open) => !open && setDeletingCut(undefined)}
        title="Eliminar corte"
        description={`¿Seguro que querés eliminar la versión "${deletingCut?.label}"?`}
        onConfirm={() => {
          if (deletingCut) deleteCutVersionMutation.mutate(deletingCut.id)
          setDeletingCut(undefined)
        }}
      />
    </div>
  )
}
