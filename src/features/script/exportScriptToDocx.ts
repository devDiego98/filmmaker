import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx"
import type { ScreenplayElementType } from "./screenplayExtension"
import type { ScreenplayLine } from "./docConversion"

const TWIPS_PER_INCH = 1440

const paragraphOptionsByType: Record<
  ScreenplayElementType,
  { indent?: { left: number }; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] }
> = {
  sceneHeading: {},
  action: {},
  character: { indent: { left: 2.2 * TWIPS_PER_INCH } },
  parenthetical: { indent: { left: 1.8 * TWIPS_PER_INCH } },
  dialogue: { indent: { left: 1 * TWIPS_PER_INCH } },
  transition: { alignment: AlignmentType.RIGHT },
}

function runFor(elementType: ScreenplayElementType, text: string): TextRun {
  const upper = elementType === "sceneHeading" || elementType === "character" || elementType === "transition"
  const displayText = elementType === "parenthetical" ? `(${text})` : text
  return new TextRun({
    text: upper ? displayText.toUpperCase() : displayText,
    bold: elementType === "sceneHeading",
    italics: elementType === "parenthetical",
    font: "Courier New",
  })
}

/** Mirrors ScriptDocumentPdf's per-element formatting so the Word export
 * (available to editors) matches what the PDF (available to readers) shows. */
export async function exportScriptToDocx(title: string, lines: ScreenplayLine[]): Promise<Blob> {
  const paragraphs = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, font: "Courier New", size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    ...lines
      .filter((line) => line.text.trim())
      .map(
        (line) =>
          new Paragraph({
            children: [runFor(line.elementType, line.text)],
            spacing: { before: 160 },
            ...paragraphOptionsByType[line.elementType],
          })
      ),
  ]

  const doc = new Document({ sections: [{ children: paragraphs }] })
  return Packer.toBlob(doc)
}
