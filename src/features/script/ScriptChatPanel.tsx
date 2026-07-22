import { useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import { Bot, Check, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabaseClient"
import { extractPlainText, findTextRange, linesToContent, type ScreenplayLine } from "./docConversion"
import { ELEMENT_LABELS } from "./screenplayExtension"

type ChatTurn = { role: "user" | "assistant"; content: string }

type SuggestedEdit = {
  originalText: string
  lines: ScreenplayLine[]
  explanation: string
}

type SuggestionState = SuggestedEdit & {
  id: string
  status: "pending" | "applied" | "rejected" | "failed"
}

type ChatMessage =
  | { kind: "turn"; role: "user" | "assistant"; content: string }
  | { kind: "suggestions"; edits: SuggestionState[] }

export function ScriptChatPanel({
  editor,
  projectId,
  canWrite,
}: {
  editor: Editor | null
  projectId: string | undefined
  canWrite: boolean
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [selectedText, setSelectedText] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!editor) return
    const updateSelection = () => {
      const { from, to } = editor.state.selection
      setSelectedText(from === to ? "" : editor.state.doc.textBetween(from, to, " "))
    }
    editor.on("selectionUpdate", updateSelection)
    return () => {
      editor.off("selectionUpdate", updateSelection)
    }
  }, [editor])

  async function handleSend() {
    const userMessage = input.trim()
    if (!editor || !projectId || !userMessage || sending) return

    const history: ChatTurn[] = messages
      .filter((m): m is Extract<ChatMessage, { kind: "turn" }> => m.kind === "turn")
      .map((m) => ({ role: m.role, content: m.content }))
    const activeSelection = selectedText

    setMessages((prev) => [...prev, { kind: "turn", role: "user", content: userMessage }])
    setInput("")
    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke("script-assistant", {
        body: {
          projectId,
          documentText: extractPlainText(editor.getJSON()),
          selectedText: activeSelection || undefined,
          history,
          userMessage,
        },
      })
      if (error) throw error
      const suggestedEdits = (data?.suggestedEdits ?? []) as SuggestedEdit[]
      setMessages((prev) => [
        ...prev,
        { kind: "turn", role: "assistant", content: data?.reply ?? "" },
        ...(suggestedEdits.length
          ? [
              {
                kind: "suggestions" as const,
                edits: suggestedEdits.map((edit, i) => ({
                  ...edit,
                  id: `${Date.now()}-${i}`,
                  status: "pending" as const,
                })),
              },
            ]
          : []),
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          kind: "turn",
          role: "assistant",
          content: "No pude conectarme con el asistente. Probá de nuevo en un momento.",
        },
      ])
    } finally {
      setSending(false)
    }
  }

  function updateEdit(groupIndex: number, editId: string, status: SuggestionState["status"]) {
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== groupIndex || m.kind !== "suggestions") return m
        return { ...m, edits: m.edits.map((e) => (e.id === editId ? { ...e, status } : e)) }
      })
    )
  }

  function applyEdit(groupIndex: number, edit: SuggestionState) {
    if (!editor) return
    const content = linesToContent(edit.lines)

    // No originalText means the AI is proposing new content rather than
    // replacing existing text (e.g. writing a scene from scratch) — append
    // it at the end of the document instead of searching for a quote.
    if (!edit.originalText.trim()) {
      editor.chain().focus().insertContentAt(editor.state.doc.content.size, content).run()
      updateEdit(groupIndex, edit.id, "applied")
      return
    }

    const range = findTextRange(editor.state.doc, edit.originalText)
    if (!range) {
      updateEdit(groupIndex, edit.id, "failed")
      return
    }
    editor.chain().focus().insertContentAt(range, content).run()
    updateEdit(groupIndex, edit.id, "applied")
  }

  return (
    <div className="flex w-80 shrink-0 flex-col gap-3 rounded-xl border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Bot className="size-4" /> Asistente de guion
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Pedile consejo sobre el guion, o seleccioná texto en el documento para pedir cambios
            solo sobre esa parte.
          </p>
        )}
        {messages.map((message, groupIndex) =>
          message.kind === "turn" ? (
            <div
              key={groupIndex}
              className={
                "rounded-lg px-3 py-2 text-sm " +
                (message.role === "user"
                  ? "ml-6 bg-primary text-primary-foreground"
                  : "mr-6 bg-muted")
              }
            >
              {message.content}
            </div>
          ) : (
            <div key={groupIndex} className="flex flex-col gap-2">
              {message.edits.map((edit) => (
                <div key={edit.id} className="rounded-lg border p-2 text-xs">
                  {edit.originalText ? (
                    <p className="text-muted-foreground line-through">{edit.originalText}</p>
                  ) : (
                    <p className="italic text-muted-foreground">Contenido nuevo:</p>
                  )}
                  <div className="mt-1 flex flex-col gap-0.5">
                    {edit.lines.map((line, i) => (
                      <p key={i}>
                        <span className="text-muted-foreground">{ELEMENT_LABELS[line.elementType]}: </span>
                        <span className="font-medium">{line.text}</span>
                      </p>
                    ))}
                  </div>
                  <p className="mt-1 text-muted-foreground">{edit.explanation}</p>
                  {edit.status === "pending" && canWrite && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => applyEdit(groupIndex, edit)}>
                        <Check /> Aceptar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateEdit(groupIndex, edit.id, "rejected")}
                      >
                        <X /> Rechazar
                      </Button>
                    </div>
                  )}
                  {edit.status === "applied" && (
                    <p className="mt-1 font-medium text-emerald-600">Aplicado</p>
                  )}
                  {edit.status === "rejected" && (
                    <p className="mt-1 text-muted-foreground">Descartado</p>
                  )}
                  {edit.status === "failed" && (
                    <p className="mt-1 text-destructive">
                      No se pudo aplicar — no se encontró ese texto en el documento.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {selectedText && (
        <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
          <span className="truncate">Analizando la selección: "{selectedText}"</span>
          <button
            type="button"
            className="ml-auto shrink-0"
            aria-label="Quitar selección"
            onClick={() => setSelectedText("")}
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pedile consejo o cambios al asistente..."
          className="min-h-16 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button size="icon" aria-label="Enviar" onClick={handleSend} disabled={sending || !input.trim()}>
          <Send />
        </Button>
      </div>
    </div>
  )
}
