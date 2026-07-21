import { useState } from "react"
import { pdf } from "@react-pdf/renderer"
import { Download, Mail, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DeleteConfirmDialog } from "@/components/form/DeleteConfirmDialog"
import { formatDateEs } from "@/lib/date"
import type { CallSheet } from "@/types"
import { useScenes, useCharacters } from "@/features/script/queries"
import { useLocations } from "@/features/locations/queries"
import { useActors } from "@/features/casting/queries"
import { useShootDays } from "@/features/schedule/queries"
import { useActiveProject } from "@/features/projects/queries"
import { usePermissions } from "@/lib/permissions"
import { useCallSheets } from "./queries"
import { CallSheetDialog } from "./CallSheetDialog"
import { buildCallSheetData } from "./buildCallSheetData"
import { CallSheetDocument } from "./CallSheetDocument"

export function CallSheetsPage() {
  const { project } = useActiveProject()
  const projectId = project?.id
  const { data: callSheets = [] } = useCallSheets.useList(projectId)
  const deleteCallSheetMutation = useCallSheets.useDelete(projectId)
  const { data: shootDays = [] } = useShootDays.useList(projectId)
  const { data: scenes = [] } = useScenes.useList(projectId)
  const { data: characters = [] } = useCharacters.useList(projectId)
  const { data: locations = [] } = useLocations.useList(projectId)
  const { data: actors = [] } = useActors.useList(projectId)
  const { canWrite } = usePermissions(project)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCallSheet, setEditingCallSheet] = useState<CallSheet | undefined>()
  const [deletingCallSheet, setDeletingCallSheet] = useState<CallSheet | undefined>()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const sorted = [...callSheets].sort((a, b) => b.date.localeCompare(a.date))

  const handleDownload = async (callSheet: CallSheet) => {
    setDownloadingId(callSheet.id)
    try {
      const data = buildCallSheetData(callSheet, shootDays, scenes, locations, characters, actors)
      const blob = await pdf(<CallSheetDocument data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `call-sheet-${callSheet.date}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canWrite("callSheets") && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingCallSheet(undefined)
              setDialogOpen(true)
            }}
            disabled={shootDays.length === 0}
          >
            <Plus /> Nuevo call sheet
          </Button>
        </div>
      )}

      {canWrite("callSheets") && shootDays.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Primero cargá al menos un día de rodaje en Calendario para poder generar un call sheet.
        </p>
      )}

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Hora de llamado</TableHead>
              <TableHead>Locación</TableHead>
              <TableHead>Escenas</TableHead>
              <TableHead>Elenco</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((callSheet) => {
              const data = buildCallSheetData(
                callSheet,
                shootDays,
                scenes,
                locations,
                characters,
                actors
              )
              return (
                <TableRow key={callSheet.id}>
                  <TableCell className="font-medium">{formatDateEs(callSheet.date)}</TableCell>
                  <TableCell>{callSheet.callTime}</TableCell>
                  <TableCell>{data.location?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{data.scenes.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{data.cast.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Descargar PDF"
                        disabled={downloadingId === callSheet.id}
                        onClick={() => handleDownload(callSheet)}
                      >
                        <Download />
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button variant="ghost" size="icon" aria-label="Enviar por email" disabled>
                              <Mail />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Requiere configurar un proveedor de email (SendGrid) — no disponible todavía.
                        </TooltipContent>
                      </Tooltip>
                      {canWrite("callSheets") && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar call sheet"
                            onClick={() => {
                              setEditingCallSheet(callSheet)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Eliminar call sheet"
                            onClick={() => setDeletingCallSheet(callSheet)}
                          >
                            <Trash2 />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Todavía no hay call sheets.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CallSheetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        callSheet={editingCallSheet}
        shootDays={shootDays}
        projectId={projectId}
      />
      <DeleteConfirmDialog
        open={!!deletingCallSheet}
        onOpenChange={(open) => !open && setDeletingCallSheet(undefined)}
        title="Eliminar call sheet"
        description={`¿Seguro que querés eliminar el call sheet del ${deletingCallSheet ? formatDateEs(deletingCallSheet.date) : ""}?`}
        onConfirm={() => {
          if (deletingCallSheet) deleteCallSheetMutation.mutate(deletingCallSheet.id)
          setDeletingCallSheet(undefined)
        }}
      />
    </div>
  )
}
