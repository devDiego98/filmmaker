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
import { teamRoleLabels, type ProjectMember } from "@/types"
import { useProjectMembers } from "@/features/projects/queries"

const memberSchema = z.object({
  email: z.string().min(1, "Requerido").email("Email inválido"),
  role: z.enum(["admin", "director", "casting_director", "crew"]),
})

type MemberFormValues = z.infer<typeof memberSchema>

const roleOptions = Object.entries(teamRoleLabels).map(([value, label]) => ({ value, label }))

type MemberDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: ProjectMember
  projectId: string | undefined
}

export function MemberDialog({ open, onOpenChange, member, projectId }: MemberDialogProps) {
  const addMember = useProjectMembers.useAdd(projectId)
  const updateMember = useProjectMembers.useUpdate(projectId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { email: "", role: "crew" },
  })

  useEffect(() => {
    if (open) {
      reset(member ? { email: member.email, role: member.role } : { email: "", role: "crew" })
    }
  }, [open, member, reset])

  const onSubmit = (values: MemberFormValues) => {
    if (member) {
      updateMember.mutate({ id: member.id, item: { role: values.role } })
    } else {
      addMember.mutate({ email: values.email.trim().toLowerCase(), role: values.role })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{member ? "Editar rol" : "Invitar por email"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          {member ? (
            <p className="text-sm text-muted-foreground">{member.email}</p>
          ) : (
            <TextField label="Email" {...register("email")} error={errors.email} />
          )}
          <SelectField label="Rol" control={control} name="role" options={roleOptions} />
          {!member && (
            <p className="text-sm text-muted-foreground">
              La persona verá este proyecto la próxima vez que inicie sesión con este email (o
              cuando cree su cuenta, si todavía no tiene una).
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{member ? "Guardar cambios" : "Invitar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
