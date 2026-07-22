import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { Clapperboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TextField } from "@/components/form/fields"
import { supabase } from "@/lib/supabaseClient"
import { useSession } from "./AuthProvider"

const passwordSchema = z.object({
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

type PasswordFormValues = z.infer<typeof passwordSchema>

function InviteCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Clapperboard className="size-4" />
            </div>
            <span className="font-semibold">FILMMAKER</span>
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}

export function AcceptInvitePage() {
  const { session, loading } = useSession()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | undefined>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  })

  const onSubmit = async (values: PasswordFormValues) => {
    setServerError(undefined)
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) {
      setServerError(error.message)
      return
    }
    navigate("/", { replace: true })
  }

  if (loading) {
    return (
      <InviteCard title="Activando invitación...">
        <p className="text-sm text-muted-foreground">Un momento...</p>
      </InviteCard>
    )
  }

  if (!session) {
    return (
      <InviteCard title="Este enlace no es válido">
        <p className="text-sm text-muted-foreground">
          El enlace de invitación expiró o ya se usó. Pedile a quien te invitó que te reenvíe la
          invitación, o iniciá sesión si ya creaste tu cuenta.
        </p>
        <Link
          to="/login"
          className="mt-4 block text-center text-sm text-foreground underline underline-offset-2"
        >
          Iniciar sesión
        </Link>
      </InviteCard>
    )
  }

  return (
    <InviteCard title="Creá tu contraseña">
      <p className="mb-4 text-sm text-muted-foreground">
        Te invitaron a un proyecto en FILMMAKER con {session.user.email}. Elegí una contraseña
        para terminar de crear tu cuenta.
      </p>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Contraseña"
          type="password"
          {...register("password")}
          error={errors.password}
        />
        {serverError && <p className="text-sm text-destructive">{serverError}</p>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Crear contraseña y entrar"}
        </Button>
      </form>
    </InviteCard>
  )
}
