import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { sceneColorLabels } from "@/types"
import { formatDateEs } from "@/lib/date"
import type { CallSheetData } from "./buildCallSheetData"

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 11, color: "#555", marginBottom: 16 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    borderBottom: "1 solid #ddd",
    paddingBottom: 2,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 90, color: "#555" },
  value: { flex: 1 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    padding: 4,
    fontWeight: 700,
  },
  tableRow: { flexDirection: "row", padding: 4, borderBottom: "1 solid #eee" },
  colSm: { width: 40 },
  colMd: { width: 90 },
  colLg: { flex: 1 },
})

export function CallSheetDocument({ data }: { data: CallSheetData }) {
  const { callSheet, location, scenes, cast } = data
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Call Sheet</Text>
        <Text style={styles.subtitle}>{formatDateEs(callSheet.date)}</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Hora de llamado</Text>
            <Text style={styles.value}>{callSheet.callTime}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Locación</Text>
            <Text style={styles.value}>
              {location ? `${location.name}${location.address ? ` — ${location.address}` : ""}` : "Sin asignar"}
            </Text>
          </View>
          {callSheet.weather && (
            <View style={styles.row}>
              <Text style={styles.label}>Clima</Text>
              <Text style={styles.value}>{callSheet.weather}</Text>
            </View>
          )}
          {callSheet.notes && (
            <View style={styles.row}>
              <Text style={styles.label}>Notas</Text>
              <Text style={styles.value}>{callSheet.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Escenas del día</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colSm}>Nº</Text>
            <Text style={styles.colLg}>Escena</Text>
            <Text style={styles.colMd}>Color</Text>
          </View>
          {scenes.map((scene) => (
            <View key={scene.id} style={styles.tableRow}>
              <Text style={styles.colSm}>{scene.number}</Text>
              <Text style={styles.colLg}>{scene.heading}</Text>
              <Text style={styles.colMd}>{sceneColorLabels[scene.color]}</Text>
            </View>
          ))}
          {scenes.length === 0 && <Text>No hay escenas asignadas a este día.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Elenco convocado</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.colMd}>Personaje</Text>
            <Text style={styles.colMd}>Actor</Text>
            <Text style={styles.colLg}>Contacto</Text>
          </View>
          {cast.map((row) => (
            <View key={row.characterName} style={styles.tableRow}>
              <Text style={styles.colMd}>{row.characterName}</Text>
              <Text style={styles.colMd}>{row.actorName}</Text>
              <Text style={styles.colLg}>{row.contact ?? "—"}</Text>
            </View>
          ))}
          {cast.length === 0 && <Text>No hay elenco convocado para este día.</Text>}
        </View>
      </Page>
    </Document>
  )
}
