import { NavLink } from "react-router-dom"
import { Clapperboard, ChevronsUpDown, Check } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { navItems } from "@/lib/navigation"
import { useProjectStore } from "@/store/useProjectStore"
import { useActiveProject } from "@/features/projects/queries"
import { useMyRole, VISIBLE_ROUTES } from "@/lib/permissions"

export function AppSidebar() {
  const { project: activeProject, projects } = useActiveProject()
  const setActiveProject = useProjectStore((state) => state.setActiveProject)
  const role = useMyRole(activeProject)
  const visibleNavItems = role
    ? navItems.filter((item) => VISIBLE_ROUTES[role].includes(item.url))
    : navItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Clapperboard className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{activeProject?.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      Día {activeProject?.currentShootDay} de {activeProject?.totalShootDays}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56" align="start">
                {projects.map((project) => (
                  <DropdownMenuItem key={project.id} onSelect={() => setActiveProject(project.id)}>
                    <span className="flex-1 truncate">{project.name}</span>
                    {project.id === activeProject?.id && <Check className="size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive }) =>
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                      }
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
