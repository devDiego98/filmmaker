import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core"
import type { Location, Scene, ShootDay } from "@/types"

type CalendarViewProps = {
  shootDays: ShootDay[]
  scenes: Scene[]
  locations: Location[]
  editable: boolean
  onSelectDay: (day: ShootDay) => void
  onSelectDate: (date: string) => void
}

export function CalendarView({
  shootDays,
  scenes,
  locations,
  editable,
  onSelectDay,
  onSelectDate,
}: CalendarViewProps) {
  const events = shootDays.map((day) => {
    const location = day.locationId ? locations.find((l) => l.id === day.locationId) : undefined
    const sceneCount = day.sceneIds.length
    return {
      id: day.id,
      start: day.date,
      allDay: true,
      title: `${location?.name ?? "Sin locación"} · ${sceneCount} esc.`,
    }
  })

  return (
    <div className="rounded-xl border p-2 [&_.fc]:text-sm [&_.fc-toolbar-title]:text-base">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        locale="es"
        firstDay={1}
        events={events}
        selectable={editable}
        select={(arg: DateSelectArg) => onSelectDate(arg.startStr)}
        dateClick={(arg) => onSelectDate(arg.dateStr)}
        eventClick={(arg: EventClickArg) => {
          const day = shootDays.find((d) => d.id === arg.event.id)
          if (day) onSelectDay(day)
        }}
      />
      {scenes.length === 0 && (
        <p className="p-2 text-center text-sm text-muted-foreground">
          Todavía no hay escenas cargadas en el guion.
        </p>
      )}
    </div>
  )
}
