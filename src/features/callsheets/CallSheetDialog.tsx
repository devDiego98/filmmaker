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
import { TextField, TextareaField, SelectField } from "@/components/form/fields"
import { formatDateEs } from "@/lib/date"
import type { CallSheet, ShootDay } from "@/types"
import { useCallSheets } from "./queries"

const callSheetSchema = z.object({
  shootDayId: z.string().min(1, "Requerido"),
  callTime: z.string().min(1, "Requerido"),
  weather: z.string().optional(),
  notes: z.string().optional(),
})

type CallSheetFormValues = z.infer<typeof callSheetSchema>

const emptyValues: CallSheetFormValues = {
  shootDayId: "",
  callTime: "07:00",
  weather: "",
  notes: "",
}

type CallSheetDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  callSheet?: CallSheet
  shootDays: ShootDay[]
  projectId: string | undefined
}

export function CallSheetDialog({
  open,
  onOpenChange,
  callSheet,
  shootDays,
  projectId,
}: CallSheetDialogProps) {
  const addCallSheet = useCallSheets.useAdd(projectId)
  const updateCallSheet = useCallSheets.useUpdate(projectId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CallSheetFormValues>({
    resolver: zodResolver(callSheetSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) {
      reset(
        callSheet
          ? {
              shootDayId: callSheet.shootDayId,
              callTime: callSheet.callTime,
              weather: callSheet.weather ?? "",
              notes: callSheet.notes ?? "",
            }
          : { ...emptyValues, shootDayId: shootDays[0]?.id ?? "" }
      )
    }
  }, [open, callSheet, shootDays, reset])

  const onSubmit = (values: CallSheetFormValues) => {
    const shootDay = shootDays.find((d) => d.id === values.shootDayId)
    const payload = { ...values, date: shootDay?.date ?? "" }
    if (callSheet) {
      updateCallSheet.mutate({ id: callSheet.id, item: payload })
    } else {
      addCallSheet.mutate(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{callSheet ? "Editar call sheet" : "Nuevo call sheet"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <SelectField
            label="Día de rodaje"
            control={control}
            name="shootDayId"
            options={shootDays.map((d) => ({ value: d.id, label: formatDateEs(d.date) }))}
            placeholder={shootDays.length === 0 ? "No hay días de rodaje cargados" : undefined}
          />
          <TextField
            label="Hora de llamado"
            type="time"
            {...register("callTime")}
            error={errors.callTime}
          />
          <TextField
            label="Clima (manual — sin integración automática)"
            {...register("weather")}
            error={errors.weather}
          />
          <TextareaField label="Notas" {...register("notes")} error={errors.notes} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={shootDays.length === 0}>
              {callSheet ? "Guardar cambios" : "Crear call sheet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
