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

const signupSchema = z.object({
  email: z.string().min(1, "Requerido").email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | undefined>()
  const [confirmationSent, setConfirmationSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: SignupFormValues) => {
    setServerError(undefined)
    const { data, error } = await supabase.auth.signUp(values)
    if (error) {
      setServerError(error.message)
      return
    }
    if (data.session) {
      navigate("/", { replace: true })
    } else {
      setConfirmationSent(true)
    }
  }

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
          <CardTitle>Crear cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          {confirmationSent ? (
            <p className="text-sm text-muted-foreground">
              Te enviamos un email de confirmación. Confirmá tu cuenta y después iniciá sesión.
            </p>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
              <TextField
                label="Email"
                type="email"
                {...register("email")}
                error={errors.email}
              />
              <TextField
                label="Contraseña"
                type="password"
                {...register("password")}
                error={errors.password}
              />
              {serverError && <p className="text-sm text-destructive">{serverError}</p>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tenés cuenta?{" "}
                <Link to="/login" className="text-foreground underline underline-offset-2">
                  Iniciar sesión
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
