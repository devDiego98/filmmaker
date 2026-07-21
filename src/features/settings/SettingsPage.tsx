import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TextField, NumberField } from "@/components/form/fields"
import { DeleteConfirmDialog } from "@/components/form/DeleteConfirmDialog"
import { teamRoleLabels, type ProjectMember } from "@/types"
import {
  useActiveProject,
  useUpdateProject,
  useProjectMembers,
  useOwnerProfile,
} from "@/features/projects/queries"
import { usePermissions } from "@/lib/permissions"
import { MemberDialog } from "./MemberDialog"

const projectSchema = z.object({
  name: z.string().min(1, "Requerido"),
  totalShootDays: z.string().min(1, "Requerido"),
})

type ProjectFormValues = z.infer<typeof projectSchema>

function GeneralSettingsForm({ isAdmin }: { isAdmin: boolean }) {
  const { project } = useActiveProject()
  const updateProject = useUpdateProject()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", totalShootDays: "" },
  })

  useEffect(() => {
    if (project) {
      reset({ name: project.name, totalShootDays: project.totalShootDays.toString() })
    }
  }, [project, reset])

  if (!project) return null

  if (!isAdmin) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
        <div>
          <div className="text-muted-foreground">Nombre del proyecto</div>
          <div className="font-medium">{project.name}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Días de rodaje totales</div>
          <div className="font-medium">{project.totalShootDays}</div>
        </div>
      </div>
    )
  }

  const onSubmit = (values: ProjectFormValues) => {
    updateProject.mutate({
      id: project.id,
      item: {
        name: values.name,
        totalShootDays: Number(values.totalShootDays) || project.totalShootDays,
      },
    })
    reset(values)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Nombre del proyecto" {...register("name")} error={errors.name} />
        <NumberField
          label="Días de rodaje totales"
          {...register("totalShootDays")}
          error={errors.totalShootDays}
        />
      </div>
      <Button type="submit" className="self-start" disabled={!isDirty}>
        Guardar cambios
      </Button>
    </form>
  )
}

export function SettingsPage() {
  const { project } = useActiveProject()
  const projectId = project?.id
  const { data: members = [] } = useProjectMembers.useList(projectId)
  const deleteMemberMutation = useProjectMembers.useDelete(projectId)
  const ownerProfile = useOwnerProfile(project?.ownerId)
  const { isAdmin } = usePermissions(project)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<ProjectMember | undefined>()
  const [deletingMember, setDeletingMember] = useState<ProjectMember | undefined>()

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Datos generales del proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <GeneralSettingsForm isAdmin={isAdmin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Equipo y roles</CardTitle>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => {
                setEditingMember(undefined)
                setDialogOpen(true)
              }}
            >
              <Plus /> Invitar miembro
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Admin/Productor tiene acceso total. Director/1st AD edita calendario, guion y
            continuidad (y ve el resto de lectura). Casting director solo ve el módulo de
            casting. Crew tiene solo lectura de call sheets y calendario. Estos permisos se
            aplican de verdad, tanto en la interfaz como en la base de datos.
          </p>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    {ownerProfile?.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{teamRoleLabels.admin}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Dueño del proyecto</Badge>
                  </TableCell>
                  <TableCell />
                </TableRow>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{teamRoleLabels[member.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {member.userId ? "Activo" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar rol"
                            onClick={() => {
                              setEditingMember(member)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Quitar miembro"
                            onClick={() => setDeletingMember(member)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <MemberDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            member={editingMember}
            projectId={projectId}
          />
          <DeleteConfirmDialog
            open={!!deletingMember}
            onOpenChange={(open) => !open && setDeletingMember(undefined)}
            title="Quitar miembro"
            description={`¿Seguro que querés quitar a "${deletingMember?.email}" del proyecto?`}
            onConfirm={() => {
              if (deletingMember) deleteMemberMutation.mutate(deletingMember.id)
              setDeletingMember(undefined)
            }}
          />
        </>
      )}
    </div>
  )
}
