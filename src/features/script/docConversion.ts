import type { JSONContent } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import type { ScreenplayElementType } from "./screenplayExtension"

export type ScreenplayLine = { elementType: ScreenplayElementType; text: string }

function textOfNode(node: JSONContent): string {
  if (!node.content) return ""
  return node.content.map((child) => child.text ?? "").join("")
}

/** Flattens the Tiptap JSON doc into one line per screenplay element —
 * shared by the AI-context extractor and both export converters. */
export function docToLines(doc: JSONContent): ScreenplayLine[] {
  return (doc.content ?? []).map((node) => ({
    elementType: (node.attrs?.elementType as ScreenplayElementType) ?? "action",
    text: textOfNode(node),
  }))
}

/** Plain text sent to the AI as document context. */
export function extractPlainText(doc: JSONContent): string {
  return docToLines(doc)
    .map((line) => line.text)
    .join("\n")
}

/** Finds `search` inside the live editor doc and returns its ProseMirror
 * position range, even when the quote spans multiple screenplay elements
 * (the AI is given the document as one line of text per element, joined by
 * "\n" — see extractPlainText — so its quotes may legitimately cross that
 * boundary, e.g. when proposing a whole new scene). Searches the same
 * newline-joined text and maps the match back to a real position range. If
 * the doc changed since the suggestion was generated, this returns null and
 * the caller shows "couldn't apply" rather than guessing at a range. */
export function findTextRange(
  doc: ProseMirrorNode,
  search: string
): { from: number; to: number } | null {
  const needle = search.trim()
  if (!needle) return null

  const spans: { text: string; start: number; pmStart: number }[] = []
  let linearOffset = 0
  doc.forEach((node, offset) => {
    const text = node.textContent
    spans.push({ text, start: linearOffset, pmStart: offset + 1 })
    linearOffset += text.length + 1 // +1 for the "\n" joiner between elements
  })
  if (spans.length === 0) return null

  const combined = spans.map((s) => s.text).join("\n")
  const idx = combined.indexOf(needle)
  if (idx === -1) return null

  const toPmPos = (linearPos: number): number => {
    for (const span of spans) {
      const spanEnd = span.start + span.text.length
      if (linearPos <= spanEnd) {
        return span.pmStart + Math.max(0, linearPos - span.start)
      }
    }
    const last = spans[spans.length - 1]
    return last.pmStart + last.text.length
  }

  return { from: toPmPos(idx), to: toPmPos(idx + needle.length) }
}

/** Builds Tiptap JSON nodes from AI-proposed lines, ready to insert into the
 * live doc via editor.commands.insertContentAt. */
export function linesToContent(lines: ScreenplayLine[]): JSONContent[] {
  return lines.map((line) => ({
    type: "screenplayElement",
    attrs: { elementType: line.elementType },
    ...(line.text.trim() ? { content: [{ type: "text", text: line.text }] } : {}),
  }))
}
