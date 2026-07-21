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
import { TextField } from "@/components/form/fields"
import type { Character } from "@/types"
import { useCharacters } from "./queries"

const characterSchema = z.object({
  name: z.string().min(1, "Requerido"),
})

type CharacterFormValues = z.infer<typeof characterSchema>

type CharacterDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  character?: Character
  projectId: string | undefined
}

export function CharacterDialog({
  open,
  onOpenChange,
  character,
  projectId,
}: CharacterDialogProps) {
  const addCharacter = useCharacters.useAdd(projectId)
  const updateCharacter = useCharacters.useUpdate(projectId)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CharacterFormValues>({
    resolver: zodResolver(characterSchema),
    defaultValues: { name: "" },
  })

  useEffect(() => {
    if (open) {
      reset({ name: character?.name ?? "" })
    }
  }, [open, character, reset])

  const onSubmit = (values: CharacterFormValues) => {
    if (character) {
      updateCharacter.mutate({ id: character.id, item: values })
    } else {
      addCharacter.mutate(values)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{character ? "Editar personaje" : "Nuevo personaje"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <TextField label="Nombre" {...register("name")} error={errors.name} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{character ? "Guardar cambios" : "Crear personaje"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
