import {
  LayoutDashboard,
  FileText,
  Users,
  MapPin,
  CalendarRange,
  Wallet,
  ClipboardList,
  Clapperboard,
  Film,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Guion", url: "/script", icon: FileText },
  { title: "Casting", url: "/casting", icon: Users },
  { title: "Locaciones", url: "/locations", icon: MapPin },
  { title: "Calendario", url: "/schedule", icon: CalendarRange },
  { title: "Presupuesto", url: "/budget", icon: Wallet },
  { title: "Call Sheets", url: "/callsheets", icon: ClipboardList },
  { title: "Continuidad", url: "/continuity", icon: Clapperboard },
  { title: "Post", url: "/post", icon: Film },
  { title: "Configuración", url: "/settings", icon: Settings },
]
