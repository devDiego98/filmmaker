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
import {
  TextField,
  NumberField,
  TextareaField,
  SelectField,
  CheckboxField,
  MultiFileField,
} from "@/components/form/fields"
import type { ContinuityEntry, Scene } from "@/types"
import { useContinuityEntries } from "./queries"

const entrySchema = z.object({
  sceneId: z.string().min(1, "Requerido"),
  takeNumber: z.string().min(1, "Requerido"),
  duration: z.string().optional(),
  notes: z.string().optional(),
  isCircleTake: z.boolean(),
  photos: z.array(z.string()),
})

type EntryFormValues = z.infer<typeof entrySchema>

type ContinuityEntryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: ContinuityEntry
  scenes: Scene[]
  projectId: string | undefined
}

export function ContinuityEntryDialog({
  open,
  onOpenChange,
  entry,
  scenes,
  projectId,
}: ContinuityEntryDialogProps) {
  const addEntry = useContinuityEntries.useAdd(projectId)
  const updateEntry = useContinuityEntries.useUpdate(projectId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      sceneId: "",
      takeNumber: "1",
      duration: "",
      notes: "",
      isCircleTake: false,
      photos: [],
    },
  })

  useEffect(() => {
    if (open) {
      reset(
        entry
          ? {
              sceneId: entry.sceneId,
              takeNumber: entry.takeNumber.toString(),
              duration: entry.duration ?? "",
              notes: entry.notes ?? "",
              isCircleTake: entry.isCircleTake,
              photos: entry.photos,
            }
          : {
              sceneId: scenes[0]?.id ?? "",
              takeNumber: "1",
              duration: "",
              notes: "",
              isCircleTake: false,
              photos: [],
            }
      )
    }
  }, [open, entry, scenes, reset])

  const onSubmit = (values: EntryFormValues) => {
    const payload = { ...values, takeNumber: Number(values.takeNumber) || 1 }
    if (entry) {
      updateEntry.mutate({ id: entry.id, item: payload })
    } else {
      addEntry.mutate(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Editar toma" : "Nueva toma"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <SelectField
            label="Escena"
            control={control}
            name="sceneId"
            options={scenes.map((s) => ({ value: s.id, label: `${s.number}. ${s.heading}` }))}
            placeholder={scenes.length === 0 ? "No hay escenas cargadas" : undefined}
          />
          <div className="grid grid-cols-2 gap-4">
            <NumberField label="Toma Nº" {...register("takeNumber")} error={errors.takeNumber} />
            <TextField label="Duración" placeholder="1:32" {...register("duration")} error={errors.duration} />
          </div>
          <CheckboxField label="Circle take (toma buena)" control={control} name="isCircleTake" />
          <TextareaField
            label="Notas de continuidad"
            {...register("notes")}
            error={errors.notes}
          />
          <MultiFileField
            label="Fotos de referencia"
            control={control}
            name="photos"
            projectId={projectId}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={scenes.length === 0}>
              {entry ? "Guardar cambios" : "Crear toma"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
