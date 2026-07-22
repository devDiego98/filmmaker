import { useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { pdf } from "@react-pdf/renderer"
import { Bold, Download, Italic, Underline as UnderlineIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useActiveProject } from "@/features/projects/queries"
import { usePermissions } from "@/lib/permissions"
import { useScriptDocument, useSaveScriptDocument } from "./documentQueries"
import { ScreenplayElement, ELEMENT_TYPES, ELEMENT_LABELS } from "./screenplayExtension"
import { docToLines } from "./docConversion"
import { ScriptDocumentPdf } from "./ScriptDocumentPdf"
import { exportScriptToDocx } from "./exportScriptToDocx"
import { ScriptChatPanel } from "./ScriptChatPanel"

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Hoisted to module scope so these are stable references across renders.
// Tiptap's useEditor rebuilds the extension manager (resetting editor state)
// whenever it sees a *new* extensions/editorProps object — which a literal
// created inside the component body would be on every render (e.g. every
// keystroke, since onUpdate triggers a state update).
const editorExtensions = [
  StarterKit.configure({
    paragraph: false,
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    blockquote: false,
    codeBlock: false,
    code: false,
    horizontalRule: false,
    link: false,
    strike: false,
  }),
  ScreenplayElement,
]

const editorProps = {
  attributes: {
    class: "min-h-[55vh] max-w-none font-mono text-sm leading-relaxed focus:outline-none",
  },
}

export function ScriptDocumentEditor() {
  const { project } = useActiveProject()
  const projectId = project?.id
  const { canRead, canWrite } = usePermissions(project)
  const canReadDoc = canRead("scriptDocument")
  const canWriteDoc = canWrite("scriptDocument")

  const { data } = useScriptDocument(projectId)
  const saveMutation = useSaveScriptDocument(projectId)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hasLoadedRef = useRef(false)

  const editor = useEditor({
    extensions: editorExtensions,
    editable: canWriteDoc,
    editorProps,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      if (!canWriteDoc || !projectId) return
      setSaveState("saving")
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        saveMutation.mutate(editor.getJSON(), { onSuccess: () => setSaveState("saved") })
      }, 1500)
    },
  })

  // Push the fetched document into the editor once, when it first arrives —
  // useEditor only consumes `content` at creation time.
  useEffect(() => {
    if (!editor || !data || hasLoadedRef.current) return
    editor.commands.setContent(data.content, { emitUpdate: false })
    hasLoadedRef.current = true
  }, [editor, data])

  useEffect(() => {
    editor?.setEditable(canWriteDoc)
  }, [editor, canWriteDoc])

  if (!canReadDoc) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No tenés permiso para ver el guion de este proyecto.
      </p>
    )
  }

  async function handleDownloadPdf() {
    if (!editor || !project) return
    setExporting("pdf")
    try {
      const blob = await pdf(
        <ScriptDocumentPdf title={project.name} lines={docToLines(editor.getJSON())} />
      ).toBlob()
      downloadBlob(blob, `${project.name}.pdf`)
    } finally {
      setExporting(null)
    }
  }

  async function handleDownloadDocx() {
    if (!editor || !project) return
    setExporting("docx")
    try {
      const blob = await exportScriptToDocx(project.name, docToLines(editor.getJSON()))
      downloadBlob(blob, `${project.name}.docx`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border p-2">
          {canWriteDoc && (
            <>
              <div className="flex flex-wrap gap-1">
                {ELEMENT_TYPES.map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={editor?.isActive("screenplayElement", { elementType: type }) ? "secondary" : "ghost"}
                    onClick={() => editor?.chain().focus().setElementType(type).run()}
                  >
                    {ELEMENT_LABELS[type]}
                  </Button>
                ))}
              </div>
              <div className="mx-1 h-5 w-px bg-border" />
              <Button
                size="icon-sm"
                variant={editor?.isActive("bold") ? "secondary" : "ghost"}
                aria-label="Negrita"
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <Bold />
              </Button>
              <Button
                size="icon-sm"
                variant={editor?.isActive("italic") ? "secondary" : "ghost"}
                aria-label="Cursiva"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <Italic />
              </Button>
              <Button
                size="icon-sm"
                variant={editor?.isActive("underline") ? "secondary" : "ghost"}
                aria-label="Subrayado"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon />
              </Button>
              <span className="ml-1 text-xs text-muted-foreground">
                {saveState === "saving" ? "Guardando…" : saveState === "saved" ? "Guardado" : ""}
              </span>
            </>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={exporting !== null}
              onClick={handleDownloadPdf}
            >
              <Download /> PDF
            </Button>
            {canWriteDoc && (
              <Button
                size="sm"
                variant="outline"
                disabled={exporting !== null}
                onClick={handleDownloadDocx}
              >
                <Download /> Word
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border p-6">
          <EditorContent editor={editor} />
        </div>
      </div>

      <ScriptChatPanel editor={editor} projectId={projectId} canWrite={canWriteDoc} />
    </div>
  )
}
