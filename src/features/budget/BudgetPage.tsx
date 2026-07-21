import { useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
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
import { DeleteConfirmDialog } from "@/components/form/DeleteConfirmDialog"
import { budgetDepartmentLabels, type BudgetItem } from "@/types"
import { useActiveProject } from "@/features/projects/queries"
import { usePermissions } from "@/lib/permissions"
import { useBudgetItems } from "./queries"
import { BudgetItemDialog } from "./BudgetItemDialog"

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export function BudgetPage() {
  const { project } = useActiveProject()
  const projectId = project?.id
  const { data: items = [] } = useBudgetItems.useList(projectId)
  const deleteItemMutation = useBudgetItems.useDelete(projectId)
  const { canWrite } = usePermissions(project)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BudgetItem | undefined>()
  const [deletingItem, setDeletingItem] = useState<BudgetItem | undefined>()

  const totals = useMemo(() => {
    const budgeted = items.reduce((sum, i) => sum + i.budgeted, 0)
    const actual = items.reduce((sum, i) => sum + i.actual, 0)
    return { budgeted, actual, delta: actual - budgeted }
  }, [items])

  const byDepartment = useMemo(() => {
    return Object.entries(budgetDepartmentLabels).map(([dept, label]) => {
      const deptItems = items.filter((i) => i.department === dept)
      return {
        department: label,
        Presupuestado: deptItems.reduce((sum, i) => sum + i.budgeted, 0),
        Real: deptItems.reduce((sum, i) => sum + i.actual, 0),
      }
    })
  }, [items])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Presupuestado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {currency.format(totals.budgeted)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Gasto real
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {currency.format(totals.actual)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Diferencia
            </CardTitle>
          </CardHeader>
          <CardContent
            className={`text-2xl font-semibold ${totals.delta > 0 ? "text-destructive" : "text-green-600"}`}
          >
            {totals.delta > 0 ? "+" : ""}
            {currency.format(totals.delta)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Presupuestado vs. real por departamento</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDepartment}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="department" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value) => currency.format(Number(value))} />
              <Legend />
              <Bar dataKey="Presupuestado" fill="#3b82f6" radius={4} />
              <Bar dataKey="Real" fill="#f59e0b" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {canWrite("budgetItems") && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingItem(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus /> Nuevo gasto
          </Button>
        </div>
      )}

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Departamento</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Presupuestado</TableHead>
              <TableHead className="text-right">Real</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const delta = item.actual - item.budgeted
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="secondary">{budgetDepartmentLabels[item.department]}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-right">{currency.format(item.budgeted)}</TableCell>
                  <TableCell className="text-right">{currency.format(item.actual)}</TableCell>
                  <TableCell
                    className={`text-right ${delta > 0 ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {delta > 0 ? "+" : ""}
                    {currency.format(delta)}
                  </TableCell>
                  <TableCell>
                    {canWrite("budgetItems") && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar gasto"
                          onClick={() => {
                            setEditingItem(item)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar gasto"
                          onClick={() => setDeletingItem(item)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Todavía no hay gastos cargados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <BudgetItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        projectId={projectId}
      />
      <DeleteConfirmDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(undefined)}
        title="Eliminar gasto"
        description={`¿Seguro que querés eliminar "${deletingItem?.description}"? Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (deletingItem) deleteItemMutation.mutate(deletingItem.id)
          setDeletingItem(undefined)
        }}
      />
    </div>
  )
}
