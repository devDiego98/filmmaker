import { mergeAttributes, Node, type CommandProps } from "@tiptap/core"

export type ScreenplayElementType =
  | "sceneHeading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition"

export const ELEMENT_TYPES: ScreenplayElementType[] = [
  "sceneHeading",
  "action",
  "character",
  "parenthetical",
  "dialogue",
  "transition",
]

export const ELEMENT_LABELS: Record<ScreenplayElementType, string> = {
  sceneHeading: "Encabezado",
  action: "Acción",
  character: "Personaje",
  parenthetical: "Paréntesis",
  dialogue: "Diálogo",
  transition: "Transición",
}

/** Tailwind classes per element, applied via the data-element-type attribute
 * so formatting is CSS-only — no text mutation, no cursor-jump risk. */
export const ELEMENT_CLASSES: Record<ScreenplayElementType, string> = {
  sceneHeading: "mt-6 font-bold uppercase",
  action: "mt-3",
  character: "ml-[30%] mt-6 uppercase",
  parenthetical: "ml-[24%] w-[38%] italic",
  dialogue: "ml-[15%] w-[60%]",
  transition: "mt-6 text-right uppercase",
}

/** Enter-key auto-continue, a simplified version of Final Draft's tab/enter
 * element cycling (kept off the Tab key so it doesn't fight normal web
 * focus navigation). */
const NEXT_ON_ENTER: Record<ScreenplayElementType, ScreenplayElementType> = {
  sceneHeading: "action",
  action: "action",
  character: "dialogue",
  parenthetical: "dialogue",
  dialogue: "action",
  transition: "sceneHeading",
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    screenplayElement: {
      setElementType: (type: ScreenplayElementType) => ReturnType
    }
  }
}

/** The sole block-level node in the screenplay document. Replaces
 * StarterKit's paragraph/heading — every line is this node, distinguished
 * only by its `elementType` attribute. */
export const ScreenplayElement = Node.create({
  name: "screenplayElement",
  group: "block",
  content: "inline*",

  addAttributes() {
    return {
      elementType: {
        default: "action",
        parseHTML: (element) => element.getAttribute("data-element-type") ?? "action",
        renderHTML: (attributes) => ({ "data-element-type": attributes.elementType }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "p" }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const elementType = (node.attrs.elementType ?? "action") as ScreenplayElementType
    // The trailing 0 is ProseMirror's "content hole" — without it the node
    // renders its wrapper tag but has nowhere to place typed/inline content.
    return ["p", mergeAttributes(HTMLAttributes, { class: ELEMENT_CLASSES[elementType] }), 0]
  },

  addCommands() {
    return {
      setElementType:
        (type: ScreenplayElementType) =>
        ({ commands }: CommandProps) =>
          commands.updateAttributes(this.name, { elementType: type }),
    }
  },

  addKeyboardShortcuts() {
    const setElementShortcut = (type: ScreenplayElementType) => () =>
      this.editor.chain().focus().setElementType(type).run()

    return {
      Enter: () => {
        const { $from } = this.editor.state.selection
        const currentType = ($from.parent.attrs.elementType ?? "action") as ScreenplayElementType
        const nextType = NEXT_ON_ENTER[currentType]
        return this.editor
          .chain()
          .splitBlock()
          .updateAttributes(this.name, { elementType: nextType })
          .run()
      },
      "Mod-1": setElementShortcut("sceneHeading"),
      "Mod-2": setElementShortcut("action"),
      "Mod-3": setElementShortcut("character"),
      "Mod-4": setElementShortcut("parenthetical"),
      "Mod-5": setElementShortcut("dialogue"),
      "Mod-6": setElementShortcut("transition"),
    }
  },
})

export const EMPTY_SCREENPLAY_DOC = {
  type: "doc",
  content: [{ type: "screenplayElement", attrs: { elementType: "sceneHeading" } }],
}
