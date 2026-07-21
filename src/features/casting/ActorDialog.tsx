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
  TextareaField,
  SelectField,
  FileField,
} from "@/components/form/fields"
import { castingStatusLabels, type Actor, type Character } from "@/types"
import { useActors } from "./queries"

const NONE = "none"

const actorSchema = z.object({
  name: z.string().min(1, "Requerido"),
  characterId: z.string(),
  status: z.enum(["searching", "auditioned", "callback", "confirmed"]),
  contact: z.string().optional(),
  agent: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  selfTapeUrl: z.string().optional(),
})

type ActorFormValues = z.infer<typeof actorSchema>

const emptyValues: ActorFormValues = {
  name: "",
  characterId: NONE,
  status: "searching",
  contact: "",
  agent: "",
  notes: "",
  photoUrl: undefined,
  selfTapeUrl: undefined,
}

const statusOptions = Object.entries(castingStatusLabels).map(([value, label]) => ({
  value,
  label,
}))

type ActorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  actor?: Actor
  characters: Character[]
  projectId: string | undefined
}

export function ActorDialog({ open, onOpenChange, actor, characters, projectId }: ActorDialogProps) {
  const addActor = useActors.useAdd(projectId)
  const updateActor = useActors.useUpdate(projectId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ActorFormValues>({
    resolver: zodResolver(actorSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) {
      reset(
        actor ? { ...emptyValues, ...actor, characterId: actor.characterId ?? NONE } : emptyValues
      )
    }
  }, [open, actor, reset])

  const onSubmit = (values: ActorFormValues) => {
    const payload = { ...values, characterId: values.characterId === NONE ? undefined : values.characterId }
    if (actor) {
      updateActor.mutate({ id: actor.id, item: payload })
    } else {
      addActor.mutate(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{actor ? "Editar actor" : "Nuevo actor"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <FileField
            label="Foto"
            control={control}
            name="photoUrl"
            accept="image/*"
            projectId={projectId}
          />
          <TextField label="Nombre" {...register("name")} error={errors.name} />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Personaje"
              control={control}
              name="characterId"
              options={[
                { value: NONE, label: "Sin asignar" },
                ...characters.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <SelectField label="Estado" control={control} name="status" options={statusOptions} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Contacto" {...register("contact")} error={errors.contact} />
            <TextField label="Agente" {...register("agent")} error={errors.agent} />
          </div>
          <FileField
            label="Self-tape"
            control={control}
            name="selfTapeUrl"
            accept="video/*"
            previewType="video"
            projectId={projectId}
          />
          <TextareaField
            label="Notas de evaluación"
            {...register("notes")}
            error={errors.notes}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{actor ? "Guardar cambios" : "Crear actor"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
