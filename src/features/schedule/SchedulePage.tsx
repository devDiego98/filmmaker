import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeleteConfirmDialog } from "@/components/form/DeleteConfirmDialog"
import type { ShootDay } from "@/types"
import { formatDateEs } from "@/lib/date"
import { useScenes } from "@/features/script/queries"
import { useLocations } from "@/features/locations/queries"
import { useActiveProject } from "@/features/projects/queries"
import { usePermissions } from "@/lib/permissions"
import { useShootDays } from "./queries"
import { CalendarView } from "./CalendarView"
import { Stripboard } from "./Stripboard"
import { ShootDayDialog } from "./ShootDayDialog"

export function SchedulePage() {
  const { project } = useActiveProject()
  const projectId = project?.id
  const { data: shootDays = [] } = useShootDays.useList(projectId)
  const deleteShootDayMutation = useShootDays.useDelete(projectId)
  const { data: scenes = [] } = useScenes.useList(projectId)
  const { data: locations = [] } = useLocations.useList(projectId)
  const { canWrite } = usePermissions(project)
  const canEdit = canWrite("shootDays")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDay, setEditingDay] = useState<ShootDay | undefined>()
  const [defaultDate, setDefaultDate] = useState<string | undefined>()
  const [deletingDay, setDeletingDay] = useState<ShootDay | undefined>()

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="stripboard">Stripboard</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <CalendarView
            shootDays={shootDays}
            scenes={scenes}
            locations={locations}
            editable={canEdit}
            onSelectDay={(day) => {
              if (!canEdit) return
              setEditingDay(day)
              setDefaultDate(undefined)
              setDialogOpen(true)
            }}
            onSelectDate={(date) => {
              if (!canEdit) return
              setEditingDay(undefined)
              setDefaultDate(date)
              setDialogOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent value="stripboard">
          <Stripboard
            shootDays={shootDays}
            scenes={scenes}
            locations={locations}
            projectId={projectId}
            editable={canEdit}
            onEditDay={(day) => {
              setEditingDay(day)
              setDefaultDate(undefined)
              setDialogOpen(true)
            }}
            onNewDay={() => {
              setEditingDay(undefined)
              setDefaultDate(undefined)
              setDialogOpen(true)
            }}
          />
        </TabsContent>
      </Tabs>

      <ShootDayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shootDay={editingDay}
        defaultDate={defaultDate}
        scenes={scenes}
        locations={locations}
        onRequestDelete={setDeletingDay}
        projectId={projectId}
      />
      <DeleteConfirmDialog
        open={!!deletingDay}
        onOpenChange={(open) => !open && setDeletingDay(undefined)}
        title="Eliminar día de rodaje"
        description={`¿Seguro que querés eliminar el día ${deletingDay ? formatDateEs(deletingDay.date) : ""}? Las escenas quedarán sin asignar.`}
        onConfirm={() => {
          if (deletingDay) deleteShootDayMutation.mutate(deletingDay.id)
          setDeletingDay(undefined)
        }}
      />
    </div>
  )
}
