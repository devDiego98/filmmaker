import { useMemo, useState } from "react"
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DeleteConfirmDialog } from "@/components/form/DeleteConfirmDialog"
import { locationStatusLabels, type Location, type LocationStatus } from "@/types"
import { useActiveProject } from "@/features/projects/queries"
import { usePermissions } from "@/lib/permissions"
import { useLocations } from "./queries"
import { LocationDialog } from "./LocationDialog"

const statusBadgeClasses: Record<LocationStatus, string> = {
  negotiating: "bg-yellow-100 text-yellow-900 border-yellow-300",
  confirmed: "bg-green-100 text-green-900 border-green-300",
  permit_pending: "bg-orange-100 text-orange-900 border-orange-300",
}

export function LocationsPage() {
  const { project } = useActiveProject()
  const projectId = project?.id
  const { data: locations = [] } = useLocations.useList(projectId)
  const deleteLocationMutation = useLocations.useDelete(projectId)
  const { canWrite } = usePermissions(project)

  const [statusFilter, setStatusFilter] = useState<LocationStatus | "all">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | undefined>()
  const [deletingLocation, setDeletingLocation] = useState<Location | undefined>()

  const filteredLocations = useMemo(
    () => locations.filter((l) => statusFilter === "all" || l.status === statusFilter),
    [locations, statusFilter]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(locationStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canWrite("locations") && (
          <Button
            className="ml-auto"
            onClick={() => {
              setEditingLocation(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus /> Nueva locación
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLocations.map((location) => (
          <Card key={location.id} className="overflow-hidden py-0">
            <div className="flex h-36 items-center justify-center bg-muted">
              {location.photos[0] ? (
                <img
                  src={location.photos[0]}
                  alt={location.name}
                  className="size-full object-cover"
                />
              ) : (
                <MapPin className="size-8 text-muted-foreground" />
              )}
            </div>
            <CardHeader className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{location.name}</CardTitle>
                <Badge className={statusBadgeClasses[location.status]} variant="outline">
                  {locationStatusLabels[location.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 text-sm">
              {location.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground underline-offset-2 hover:underline"
                >
                  {location.address}
                </a>
              )}
              {location.notes && <p className="text-muted-foreground">{location.notes}</p>}
            </CardContent>
            {canWrite("locations") && (
              <CardFooter className="justify-end gap-1 pb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar locación"
                  onClick={() => {
                    setEditingLocation(location)
                    setDialogOpen(true)
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar locación"
                  onClick={() => setDeletingLocation(location)}
                >
                  <Trash2 />
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
        {filteredLocations.length === 0 && (
          <p className="col-span-full py-8 text-center text-muted-foreground">
            No hay locaciones que coincidan con el filtro.
          </p>
        )}
      </div>

      <LocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        location={editingLocation}
        projectId={projectId}
      />
      <DeleteConfirmDialog
        open={!!deletingLocation}
        onOpenChange={(open) => !open && setDeletingLocation(undefined)}
        title="Eliminar locación"
        description={`¿Seguro que querés eliminar "${deletingLocation?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (deletingLocation) deleteLocationMutation.mutate(deletingLocation.id)
          setDeletingLocation(undefined)
        }}
      />
    </div>
  )
}
