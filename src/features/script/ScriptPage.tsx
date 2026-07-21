import { useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeleteConfirmDialog } from "@/components/form/DeleteConfirmDialog"
import { sceneColorLabels, type Character, type Scene, type SceneColor } from "@/types"
import { useLocations } from "@/features/locations/queries"
import { useActiveProject } from "@/features/projects/queries"
import { usePermissions } from "@/lib/permissions"
import { useScenes, useCharacters } from "./queries"
import { SceneDialog } from "./SceneDialog"
import { CharacterDialog } from "./CharacterDialog"

const sceneColorClasses: Record<SceneColor, string> = {
  white: "bg-white text-neutral-900 border-neutral-300",
  blue: "bg-blue-100 text-blue-900 border-blue-300",
  pink: "bg-pink-100 text-pink-900 border-pink-300",
  yellow: "bg-yellow-100 text-yellow-900 border-yellow-300",
}

export function ScriptPage() {
  const { project } = useActiveProject()
  const projectId = project?.id
  const { data: scenes = [] } = useScenes.useList(projectId)
  const { data: characters = [] } = useCharacters.useList(projectId)
  const deleteSceneMutation = useScenes.useDelete(projectId)
  const updateSceneMutation = useScenes.useUpdate(projectId)
  const deleteCharacterMutation = useCharacters.useDelete(projectId)
  const { data: locations = [] } = useLocations.useList(projectId)
  const { canWrite } = usePermissions(project)

  const [search, setSearch] = useState("")
  const [colorFilter, setColorFilter] = useState<SceneColor | "all">("all")
  const [sceneDialogOpen, setSceneDialogOpen] = useState(false)
  const [editingScene, setEditingScene] = useState<Scene | undefined>()
  const [deletingScene, setDeletingScene] = useState<Scene | undefined>()
  const [characterDialogOpen, setCharacterDialogOpen] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | undefined>()
  const [deletingCharacter, setDeletingCharacter] = useState<Character | undefined>()

  const characterById = useMemo(
    () => new Map(characters.map((c) => [c.id, c.name])),
    [characters]
  )
  const locationById = useMemo(
    () => new Map(locations.map((l) => [l.id, l.name])),
    [locations]
  )

  const filteredScenes = useMemo(() => {
    const term = search.trim().toLowerCase()
    return scenes.filter((scene) => {
      if (colorFilter !== "all" && scene.color !== colorFilter) return false
      if (!term) return true
      const characterNames = scene.characterIds.map((id) => characterById.get(id) ?? "")
      const haystack = [
        scene.heading,
        scene.number,
        ...characterNames,
        ...scene.props,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [scenes, search, colorFilter, characterById])

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="scenes">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="scenes">Escenas</TabsTrigger>
            <TabsTrigger value="characters">Personajes</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="scenes" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar por personaje, prop o escena..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={colorFilter} onValueChange={(v) => setColorFilter(v as typeof colorFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los colores</SelectItem>
                {Object.entries(sceneColorLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canWrite("scenes") && (
              <Button
                className="ml-auto"
                onClick={() => {
                  setEditingScene(undefined)
                  setSceneDialogOpen(true)
                }}
              >
                <Plus /> Nueva escena
              </Button>
            )}
          </div>

          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Nº</TableHead>
                  <TableHead>Escena</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Locación</TableHead>
                  <TableHead>Personajes</TableHead>
                  <TableHead>Props</TableHead>
                  <TableHead className="w-20 text-right">Min.</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScenes.map((scene) => (
                  <TableRow key={scene.id}>
                    <TableCell className="font-medium">{scene.number}</TableCell>
                    <TableCell>
                      <div className="font-medium">{scene.heading}</div>
                      {scene.synopsis && (
                        <div className="text-sm text-muted-foreground">{scene.synopsis}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={sceneColorClasses[scene.color]} variant="outline">
                        {sceneColorLabels[scene.color]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {scene.locationId ? locationById.get(scene.locationId) ?? "—" : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {scene.characterIds.map((id) => (
                          <Badge key={id} variant="secondary">
                            {characterById.get(id) ?? "?"}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {scene.props.map((prop) => (
                          <Badge key={prop} variant="outline">
                            {prop}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{scene.estimatedMinutes ?? "—"}</TableCell>
                    <TableCell>
                      {canWrite("scenes") && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar escena"
                            onClick={() => {
                              setEditingScene(scene)
                              setSceneDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Eliminar escena"
                            onClick={() => setDeletingScene(scene)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredScenes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No hay escenas que coincidan con el filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="characters" className="flex flex-col gap-4">
          {canWrite("characters") && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditingCharacter(undefined)
                  setCharacterDialogOpen(true)
                }}
              >
                <Plus /> Nuevo personaje
              </Button>
            </div>
          )}
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Escenas</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {characters.map((character) => (
                  <TableRow key={character.id}>
                    <TableCell className="font-medium">{character.name}</TableCell>
                    <TableCell>
                      {scenes.filter((s) => s.characterIds.includes(character.id)).length}
                    </TableCell>
                    <TableCell>
                      {canWrite("characters") && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar personaje"
                            onClick={() => {
                              setEditingCharacter(character)
                              setCharacterDialogOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Eliminar personaje"
                            onClick={() => setDeletingCharacter(character)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {characters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      Todavía no hay personajes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <SceneDialog
        open={sceneDialogOpen}
        onOpenChange={setSceneDialogOpen}
        scene={editingScene}
        characters={characters}
        locations={locations}
        projectId={projectId}
      />
      <CharacterDialog
        open={characterDialogOpen}
        onOpenChange={setCharacterDialogOpen}
        character={editingCharacter}
        projectId={projectId}
      />
      <DeleteConfirmDialog
        open={!!deletingScene}
        onOpenChange={(open) => !open && setDeletingScene(undefined)}
        title="Eliminar escena"
        description={`¿Seguro que querés eliminar la escena "${deletingScene?.heading}"? Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (deletingScene) deleteSceneMutation.mutate(deletingScene.id)
          setDeletingScene(undefined)
        }}
      />
      <DeleteConfirmDialog
        open={!!deletingCharacter}
        onOpenChange={(open) => !open && setDeletingCharacter(undefined)}
        title="Eliminar personaje"
        description={`¿Seguro que querés eliminar a "${deletingCharacter?.name}"? Se quitará de todas las escenas.`}
        onConfirm={async () => {
          if (deletingCharacter) {
            const affected = scenes.filter((s) => s.characterIds.includes(deletingCharacter.id))
            await Promise.all(
              affected.map(({ id, ...rest }) =>
                updateSceneMutation.mutateAsync({
                  id,
                  item: {
                    ...rest,
                    characterIds: rest.characterIds.filter((cid) => cid !== deletingCharacter.id),
                  },
                })
              )
            )
            await deleteCharacterMutation.mutateAsync(deletingCharacter.id)
          }
          setDeletingCharacter(undefined)
        }}
      />
    </div>
  )
}
