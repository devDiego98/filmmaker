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
  NumberField,
  SelectField,
  MultiCheckboxField,
  TagsField,
} from "@/components/form/fields"
import { sceneColorLabels, type Character, type Location, type Scene } from "@/types"
import { useScenes } from "./queries"

const NONE = "none"

const sceneSchema = z.object({
  number: z.string().min(1, "Requerido"),
  heading: z.string().min(1, "Requerido"),
  synopsis: z.string().optional(),
  color: z.enum(["white", "blue", "pink", "yellow"]),
  locationId: z.string(),
  characterIds: z.array(z.string()),
  props: z.array(z.string()),
  wardrobe: z.array(z.string()),
  effects: z.array(z.string()),
  vehicles: z.array(z.string()),
  extras: z.array(z.string()),
  estimatedMinutes: z.string().optional(),
})

type SceneFormValues = z.infer<typeof sceneSchema>

const emptyValues: SceneFormValues = {
  number: "",
  heading: "",
  synopsis: "",
  color: "white",
  locationId: NONE,
  characterIds: [],
  props: [],
  wardrobe: [],
  effects: [],
  vehicles: [],
  extras: [],
  estimatedMinutes: "",
}

const colorOptions = Object.entries(sceneColorLabels).map(([value, label]) => ({
  value,
  label,
}))

type SceneDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  scene?: Scene
  characters: Character[]
  locations: Location[]
  projectId: string | undefined
}

export function SceneDialog({
  open,
  onOpenChange,
  scene,
  characters,
  locations,
  projectId,
}: SceneDialogProps) {
  const addScene = useScenes.useAdd(projectId)
  const updateScene = useScenes.useUpdate(projectId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SceneFormValues>({
    resolver: zodResolver(sceneSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) {
      reset(
        scene
          ? {
              ...emptyValues,
              ...scene,
              locationId: scene.locationId ?? NONE,
              estimatedMinutes: scene.estimatedMinutes?.toString() ?? "",
            }
          : emptyValues
      )
    }
  }, [open, scene, reset])

  const onSubmit = (values: SceneFormValues) => {
    const payload = {
      ...values,
      locationId: values.locationId === NONE ? undefined : values.locationId,
      estimatedMinutes: values.estimatedMinutes ? Number(values.estimatedMinutes) : undefined,
    }
    if (scene) {
      updateScene.mutate({ id: scene.id, item: payload })
    } else {
      addScene.mutate(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{scene ? "Editar escena" : "Nueva escena"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Número" {...register("number")} error={errors.number} />
            <SelectField
              label="Color"
              control={control}
              name="color"
              options={colorOptions}
            />
          </div>
          <TextField
            label="Slugline (INT/EXT. LUGAR - MOMENTO)"
            {...register("heading")}
            error={errors.heading}
          />
          <TextareaField label="Sinopsis" {...register("synopsis")} error={errors.synopsis} />
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Duración estimada (min)"
              {...register("estimatedMinutes")}
              error={errors.estimatedMinutes}
            />
            <SelectField
              label="Locación"
              control={control}
              name="locationId"
              options={[
                { value: NONE, label: "Sin asignar" },
                ...locations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          </div>
          <MultiCheckboxField
            label="Personajes"
            control={control}
            name="characterIds"
            options={characters.map((c) => ({ value: c.id, label: c.name }))}
            emptyHint="Todavía no hay personajes cargados. Agregalos en la pestaña Personajes."
          />
          <TagsField label="Props" control={control} name="props" placeholder="Agregar prop" />
          <TagsField
            label="Vestuario"
            control={control}
            name="wardrobe"
            placeholder="Agregar vestuario"
          />
          <TagsField
            label="Efectos"
            control={control}
            name="effects"
            placeholder="Agregar efecto"
          />
          <TagsField
            label="Vehículos"
            control={control}
            name="vehicles"
            placeholder="Agregar vehículo"
          />
          <TagsField
            label="Extras"
            control={control}
            name="extras"
            placeholder="Agregar extra"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{scene ? "Guardar cambios" : "Crear escena"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
