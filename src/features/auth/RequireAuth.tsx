import { Navigate, Outlet } from "react-router-dom"
import { useSession } from "./AuthProvider"

export function RequireAuth() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Cargando...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
