import { useMemo } from "react"
import { Link, Navigate } from "react-router-dom"
import { AlertTriangle, CalendarDays, ClipboardList, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActiveProject } from "@/features/projects/queries"
import { useScenes } from "@/features/script/queries"
import { useLocations } from "@/features/locations/queries"
import { useShootDays } from "@/features/schedule/queries"
import { useBudgetItems } from "@/features/budget/queries"
import { useCallSheets } from "@/features/callsheets/queries"
import { sceneColorLabels, locationStatusLabels } from "@/types"
import { formatDateEs, toISODate } from "@/lib/date"
import { useMyRole, DEFAULT_ROUTE } from "@/lib/permissions"
import { CreateFirstProjectForm } from "./CreateFirstProjectForm"

export function DashboardPage() {
  const { project, projects, isLoading } = useActiveProject()
  const projectId = project?.id
  const role = useMyRole(project)
  const { data: scenes = [] } = useScenes.useList(projectId)
  const { data: locations = [] } = useLocations.useList(projectId)
  const { data: shootDays = [] } = useShootDays.useList(projectId)
  const { data: budgetItems = [] } = useBudgetItems.useList(projectId)
  const { data: callSheets = [] } = useCallSheets.useList(projectId)

  const today = toISODate(new Date())

  const nextShootDay = useMemo(() => {
    const upcoming = shootDays
      .filter((d) => d.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
    return upcoming[0]
  }, [shootDays, today])

  const nextScenes = useMemo(
    () => (nextShootDay ? scenes.filter((s) => nextShootDay.sceneIds.includes(s.id)) : []),
    [nextShootDay, scenes]
  )

  const nextLocation = useMemo(
    () => (nextShootDay?.locationId ? locations.find((l) => l.id === nextShootDay.locationId) : undefined),
    [nextShootDay, locations]
  )

  const pendingLocations = useMemo(
    () => locations.filter((l) => l.status !== "confirmed"),
    [locations]
  )

  const overBudgetItems = useMemo(
    () => budgetItems.filter((i) => i.actual > i.budgeted),
    [budgetItems]
  )

  const hasCallSheetForNextDay = useMemo(
    () => !!nextShootDay && callSheets.some((c) => c.shootDayId === nextShootDay.id),
    [nextShootDay, callSheets]
  )

  const alerts = [
    ...pendingLocations.map((l) => ({
      key: `loc-${l.id}`,
      text: `${l.name} — ${locationStatusLabels[l.status]}`,
      href: "/locations",
    })),
    ...overBudgetItems.map((i) => ({
      key: `budget-${i.id}`,
      text: `${i.description} superó el presupuesto`,
      href: "/budget",
    })),
    ...(nextShootDay && !hasCallSheetForNextDay
      ? [
          {
            key: "callsheet-missing",
            text: `Falta el call sheet del ${formatDateEs(nextShootDay.date)}`,
            href: "/callsheets",
          },
        ]
      : []),
  ]

  if (isLoading) {
    return null
  }

  if (projects.length === 0) {
    return <CreateFirstProjectForm />
  }

  if (role === undefined) {
    return null
  }

  if (role === "casting_director" || role === "crew") {
    return <Navigate to={DEFAULT_ROUTE[role]} replace />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Progreso de rodaje
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            Día {project?.currentShootDay} de {project?.totalShootDays}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Próximo día de rodaje
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {nextShootDay ? formatDateEs(nextShootDay.date) : "Sin programar"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Alertas</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-2xl font-semibold ${alerts.length > 0 ? "text-destructive" : ""}`}
          >
            {alerts.length}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4" /> Próximas escenas
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/schedule">Ver calendario</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {nextShootDay ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  {nextLocation?.name ?? "Locación sin asignar"}
                </div>
                <div className="flex flex-col gap-2">
                  {nextScenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="flex items-center gap-2 rounded-md border p-2 text-sm"
                    >
                      <span className="font-medium">{scene.number}</span>
                      <span className="flex-1 truncate">{scene.heading}</span>
                      <Badge variant="outline">{sceneColorLabels[scene.color]}</Badge>
                    </div>
                  ))}
                  {nextScenes.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Todavía no hay escenas asignadas a este día.
                    </p>
                  )}
                </div>
                <Button asChild size="sm" className="mt-1 self-start">
                  <Link to="/callsheets">
                    <ClipboardList /> Ir al call sheet
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay próximos días de rodaje programados.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <Link
                key={alert.key}
                to={alert.href}
                className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted/50"
              >
                <span>{alert.text}</span>
                <span className="text-muted-foreground">→</span>
              </Link>
            ))}
            {alerts.length === 0 && (
              <p className="text-sm text-muted-foreground">Todo en orden por ahora.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
