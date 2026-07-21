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
import { TextField, TextareaField, SelectField, MultiFileField } from "@/components/form/fields"
import { locationStatusLabels, type Location } from "@/types"
import { useLocations } from "./queries"

const locationSchema = z.object({
  name: z.string().min(1, "Requerido"),
  address: z.string().optional(),
  status: z.enum(["negotiating", "confirmed", "permit_pending"]),
  photos: z.array(z.string()),
  notes: z.string().optional(),
})

type LocationFormValues = z.infer<typeof locationSchema>

const emptyValues: LocationFormValues = {
  name: "",
  address: "",
  status: "negotiating",
  photos: [],
  notes: "",
}

const statusOptions = Object.entries(locationStatusLabels).map(([value, label]) => ({
  value,
  label,
}))

type LocationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  location?: Location
  projectId: string | undefined
}

export function LocationDialog({ open, onOpenChange, location, projectId }: LocationDialogProps) {
  const addLocation = useLocations.useAdd(projectId)
  const updateLocation = useLocations.useUpdate(projectId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) {
      reset(location ? { ...emptyValues, ...location } : emptyValues)
    }
  }, [open, location, reset])

  const onSubmit = (values: LocationFormValues) => {
    if (location) {
      updateLocation.mutate({ id: location.id, item: values })
    } else {
      addLocation.mutate(values)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{location ? "Editar locación" : "Nueva locación"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <TextField label="Nombre" {...register("name")} error={errors.name} />
          <TextField label="Dirección" {...register("address")} error={errors.address} />
          <SelectField label="Estado" control={control} name="status" options={statusOptions} />
          <MultiFileField label="Fotos" control={control} name="photos" projectId={projectId} />
          <TextareaField label="Notas" {...register("notes")} error={errors.notes} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{location ? "Guardar cambios" : "Crear locación"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
