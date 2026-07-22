import { useEffect, useState } from "react"
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
import { supabase } from "@/lib/supabaseClient"

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
  const [serverError, setServerError] = useState<string | undefined>()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { email: "", role: "crew" },
  })

  useEffect(() => {
    if (open) {
      setServerError(undefined)
      reset(member ? { email: member.email, role: member.role } : { email: "", role: "crew" })
    }
  }, [open, member, reset])

  const onSubmit = async (values: MemberFormValues) => {
    setServerError(undefined)
    if (member) {
      updateMember.mutate({ id: member.id, item: { role: values.role } })
      onOpenChange(false)
      return
    }

    const email = values.email.trim().toLowerCase()
    try {
      await addMember.mutateAsync({ email, role: values.role })
    } catch {
      setServerError("No se pudo agregar el miembro. Probá de nuevo.")
      return
    }

    // The member row above is what actually grants access once claimed —
    // this is a soft, best-effort notification for someone with no account
    // yet, so a failure here doesn't block the invite.
    if (projectId) {
      const { error } = await supabase.functions.invoke("invite-member", {
        body: { projectId, email, redirectTo: `${window.location.origin}/invite` },
      })
      if (error) {
        setServerError(
          "Se agregó al proyecto, pero no se pudo enviar el email de invitación. Si todavía no tiene cuenta, avisale por otro medio."
        )
        return
      }
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
              Si ya tiene cuenta, verá este proyecto la próxima vez que inicie sesión con este
              email. Si no tiene cuenta, le mandamos un email para que cree una contraseña y
              entre directo al proyecto.
            </p>
          )}
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : member ? "Guardar cambios" : "Invitar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
