import { Document, Page, Text, StyleSheet } from "@react-pdf/renderer"
import type { ScreenplayLine } from "./docConversion"

const styles = StyleSheet.create({
  page: { padding: 56, fontSize: 12, fontFamily: "Courier" },
  title: { fontSize: 14, fontFamily: "Courier-Bold", marginBottom: 24, textAlign: "center" },
  sceneHeading: { fontFamily: "Courier-Bold", marginTop: 14, textTransform: "uppercase" },
  action: { marginTop: 8 },
  character: { marginTop: 14, marginLeft: "35%", textTransform: "uppercase" },
  parenthetical: { marginLeft: "28%", width: "40%", fontFamily: "Courier-Oblique" },
  dialogue: { marginLeft: "18%", width: "58%" },
  transition: { marginTop: 14, textAlign: "right", textTransform: "uppercase" },
})

export function ScriptDocumentPdf({
  title,
  lines,
}: {
  title: string
  lines: ScreenplayLine[]
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {lines.map(
          (line, i) =>
            line.text.trim() && (
              <Text key={i} style={styles[line.elementType]}>
                {line.elementType === "parenthetical" ? `(${line.text})` : line.text}
              </Text>
            )
        )}
      </Page>
    </Document>
  )
}
