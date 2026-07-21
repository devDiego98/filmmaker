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
import { TextField, NumberField, SelectField } from "@/components/form/fields"
import { budgetDepartmentLabels, type BudgetItem } from "@/types"
import { useBudgetItems } from "./queries"

const budgetItemSchema = z.object({
  department: z.enum(["arte", "vestuario", "camara", "sonido", "produccion", "otros"]),
  description: z.string().min(1, "Requerido"),
  budgeted: z.string().min(1, "Requerido"),
  actual: z.string().optional(),
})

type BudgetItemFormValues = z.infer<typeof budgetItemSchema>

const emptyValues: BudgetItemFormValues = {
  department: "arte",
  description: "",
  budgeted: "",
  actual: "",
}

const departmentOptions = Object.entries(budgetDepartmentLabels).map(([value, label]) => ({
  value,
  label,
}))

type BudgetItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: BudgetItem
  projectId: string | undefined
}

export function BudgetItemDialog({ open, onOpenChange, item, projectId }: BudgetItemDialogProps) {
  const addItem = useBudgetItems.useAdd(projectId)
  const updateItem = useBudgetItems.useUpdate(projectId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<BudgetItemFormValues>({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) {
      reset(
        item
          ? {
              department: item.department,
              description: item.description,
              budgeted: item.budgeted.toString(),
              actual: item.actual.toString(),
            }
          : emptyValues
      )
    }
  }, [open, item, reset])

  const onSubmit = (values: BudgetItemFormValues) => {
    const payload = {
      department: values.department,
      description: values.description,
      budgeted: Number(values.budgeted) || 0,
      actual: Number(values.actual) || 0,
    }
    if (item) {
      updateItem.mutate({ id: item.id, item: payload })
    } else {
      addItem.mutate(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <SelectField
            label="Departamento"
            control={control}
            name="department"
            options={departmentOptions}
          />
          <TextField
            label="Descripción"
            {...register("description")}
            error={errors.description}
          />
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Presupuestado"
              {...register("budgeted")}
              error={errors.budgeted}
            />
            <NumberField label="Gasto real" {...register("actual")} error={errors.actual} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{item ? "Guardar cambios" : "Crear gasto"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
