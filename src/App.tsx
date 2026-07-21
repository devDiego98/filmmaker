import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppLayout } from "@/layouts/AppLayout"
import { AuthProvider } from "@/features/auth/AuthProvider"
import { RequireAuth } from "@/features/auth/RequireAuth"
import { LoginPage } from "@/features/auth/LoginPage"
import { SignupPage } from "@/features/auth/SignupPage"
import { MissingConfigScreen } from "@/features/auth/MissingConfigScreen"
import { DashboardPage } from "@/features/dashboard/DashboardPage"
import { ScriptPage } from "@/features/script/ScriptPage"
import { CastingPage } from "@/features/casting/CastingPage"
import { LocationsPage } from "@/features/locations/LocationsPage"
import { SchedulePage } from "@/features/schedule/SchedulePage"
import { BudgetPage } from "@/features/budget/BudgetPage"
import { CallSheetsPage } from "@/features/callsheets/CallSheetsPage"
import { ContinuityPage } from "@/features/continuity/ContinuityPage"
import { PostProductionPage } from "@/features/postproduction/PostProductionPage"
import { SettingsPage } from "@/features/settings/SettingsPage"
import { PagePlaceholder } from "@/components/layout/PagePlaceholder"
import { isSupabaseConfigured } from "@/lib/supabaseClient"

const queryClient = new QueryClient()

function App() {
  if (!isSupabaseConfigured) {
    return <MissingConfigScreen />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="script" element={<ScriptPage />} />
                  <Route path="casting" element={<CastingPage />} />
                  <Route path="locations" element={<LocationsPage />} />
                  <Route path="schedule" element={<SchedulePage />} />
                  <Route path="budget" element={<BudgetPage />} />
                  <Route path="callsheets" element={<CallSheetsPage />} />
                  <Route path="continuity" element={<ContinuityPage />} />
                  <Route path="post" element={<PostProductionPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route
                    path="*"
                    element={<PagePlaceholder title="404" description="Página no encontrada." />}
                  />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
