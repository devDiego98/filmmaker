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
import { TextField, TextareaField, DateField } from "@/components/form/fields"
import { toISODate } from "@/lib/date"
import type { CutVersion } from "@/types"
import { useCutVersions } from "./queries"

const cutVersionSchema = z.object({
  label: z.string().min(1, "Requerido"),
  date: z.string().min(1, "Requerido"),
  notes: z.string().optional(),
})

type CutVersionFormValues = z.infer<typeof cutVersionSchema>

type CutVersionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cutVersion?: CutVersion
  projectId: string | undefined
}

export function CutVersionDialog({
  open,
  onOpenChange,
  cutVersion,
  projectId,
}: CutVersionDialogProps) {
  const addCutVersion = useCutVersions.useAdd(projectId)
  const updateCutVersion = useCutVersions.useUpdate(projectId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CutVersionFormValues>({
    resolver: zodResolver(cutVersionSchema),
    defaultValues: { label: "", date: toISODate(new Date()), notes: "" },
  })

  useEffect(() => {
    if (open) {
      reset(
        cutVersion
          ? { label: cutVersion.label, date: cutVersion.date, notes: cutVersion.notes ?? "" }
          : { label: "", date: toISODate(new Date()), notes: "" }
      )
    }
  }, [open, cutVersion, reset])

  const onSubmit = (values: CutVersionFormValues) => {
    if (cutVersion) {
      updateCutVersion.mutate({ id: cutVersion.id, item: values })
    } else {
      addCutVersion.mutate(values)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{cutVersion ? "Editar corte" : "Nuevo corte"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Versión"
            placeholder="v1, v2, final..."
            {...register("label")}
            error={errors.label}
          />
          <DateField label="Fecha" control={control} name="date" error={errors.date} />
          <TextareaField label="Notas" {...register("notes")} error={errors.notes} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{cutVersion ? "Guardar cambios" : "Crear corte"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
