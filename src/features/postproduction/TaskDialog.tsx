import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TextField, SelectField } from "@/components/form/fields"
import { postTaskStatusLabels, type PostTask } from "@/types"
import { usePostTasks } from "./queries"

const taskSchema = z.object({
  title: z.string().min(1, "Requerido"),
  status: z.enum(["todo", "in_progress", "done"]),
})

type TaskFormValues = z.infer<typeof taskSchema>

const statusOptions = Object.entries(postTaskStatusLabels).map(([value, label]) => ({
  value,
  label,
}))

type TaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: PostTask
  projectId: string | undefined
}

export function TaskDialog({ open, onOpenChange, task, projectId }: TaskDialogProps) {
  const addTask = usePostTasks.useAdd(projectId)
  const updateTask = usePostTasks.useUpdate(projectId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", status: "todo" },
  })

  useEffect(() => {
    if (open) {
      reset(task ? { title: task.title, status: task.status } : { title: "", status: "todo" })
    }
  }, [open, task, reset])

  const onSubmit = (values: TaskFormValues) => {
    if (task) {
      updateTask.mutate({ id: task.id, item: values })
    } else {
      addTask.mutate(values)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <TextField label="Título" {...register("title")} error={errors.title} />
          <SelectField label="Estado" control={control} name="status" options={statusOptions} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{task ? "Guardar cambios" : "Crear tarea"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
