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
import { DateField, SelectField, MultiCheckboxField } from "@/components/form/fields"
import type { Location, Scene, ShootDay } from "@/types"
import { toISODate } from "@/lib/date"
import { useShootDays } from "./queries"

const NONE = "none"

const shootDaySchema = z.object({
  date: z.string().min(1, "Requerido"),
  locationId: z.string(),
  sceneIds: z.array(z.string()),
})

type ShootDayFormValues = z.infer<typeof shootDaySchema>

type ShootDayDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  shootDay?: ShootDay
  defaultDate?: string
  scenes: Scene[]
  locations: Location[]
  onRequestDelete?: (shootDay: ShootDay) => void
  projectId: string | undefined
}

export function ShootDayDialog({
  open,
  onOpenChange,
  shootDay,
  defaultDate,
  scenes,
  locations,
  onRequestDelete,
  projectId,
}: ShootDayDialogProps) {
  const addShootDay = useShootDays.useAdd(projectId)
  const updateShootDay = useShootDays.useUpdate(projectId)

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ShootDayFormValues>({
    resolver: zodResolver(shootDaySchema),
    defaultValues: { date: toISODate(new Date()), locationId: NONE, sceneIds: [] },
  })

  useEffect(() => {
    if (open) {
      reset({
        date: shootDay?.date ?? defaultDate ?? toISODate(new Date()),
        locationId: shootDay?.locationId ?? NONE,
        sceneIds: shootDay?.sceneIds ?? [],
      })
    }
  }, [open, shootDay, defaultDate, reset])

  const onSubmit = (values: ShootDayFormValues) => {
    const locationId = values.locationId === NONE ? undefined : values.locationId
    if (shootDay) {
      updateShootDay.mutate({
        id: shootDay.id,
        item: { date: values.date, locationId, sceneIds: values.sceneIds },
      })
    } else {
      addShootDay.mutate({ date: values.date, locationId, sceneIds: [] })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{shootDay ? "Editar día de rodaje" : "Nuevo día de rodaje"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <DateField label="Fecha" control={control} name="date" error={errors.date} />
          <SelectField
            label="Locación"
            control={control}
            name="locationId"
            options={[
              { value: NONE, label: "Sin asignar" },
              ...locations.map((l) => ({ value: l.id, label: l.name })),
            ]}
          />
          {shootDay && (
            <MultiCheckboxField
              label="Escenas"
              control={control}
              name="sceneIds"
              options={scenes.map((s) => ({ value: s.id, label: `${s.number}. ${s.heading}` }))}
              emptyHint="Todavía no hay escenas cargadas."
            />
          )}
          <DialogFooter>
            {shootDay && onRequestDelete && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                onClick={() => {
                  onOpenChange(false)
                  onRequestDelete(shootDay)
                }}
              >
                Eliminar día
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{shootDay ? "Guardar cambios" : "Crear día"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
