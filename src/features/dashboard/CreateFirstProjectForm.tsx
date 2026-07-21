import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Clapperboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TextField, NumberField } from "@/components/form/fields"
import { useAddProject } from "@/features/projects/queries"

const projectSchema = z.object({
  name: z.string().min(1, "Requerido"),
  totalShootDays: z.string().min(1, "Requerido"),
})

type ProjectFormValues = z.infer<typeof projectSchema>

export function CreateFirstProjectForm() {
  const addProject = useAddProject()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", totalShootDays: "" },
  })

  const onSubmit = (values: ProjectFormValues) => {
    addProject.mutate({
      name: values.name,
      currentShootDay: 0,
      totalShootDays: Number(values.totalShootDays) || 0,
    })
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Clapperboard className="size-4" />
            </div>
            <span className="font-semibold">FILMMAKER</span>
          </div>
          <CardTitle>Creá tu primer proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="Nombre del proyecto"
              {...register("name")}
              error={errors.name}
            />
            <NumberField
              label="Días de rodaje totales"
              {...register("totalShootDays")}
              error={errors.totalShootDays}
            />
            <Button type="submit" disabled={isSubmitting}>
              Crear proyecto
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
