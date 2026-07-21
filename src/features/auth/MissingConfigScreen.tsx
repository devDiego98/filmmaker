import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MissingConfigScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Falta configurar Supabase</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Esta app necesita un proyecto de Supabase para el login y la base de datos. Todavía no
            se configuraron las variables de entorno.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Creá una cuenta y un proyecto gratis en{" "}
              <span className="text-foreground">supabase.com</span>.
            </li>
            <li>
              En el proyecto, andá a <span className="text-foreground">SQL Editor</span> y pegá y
              ejecutá el contenido de <code className="text-foreground">supabase/schema.sql</code>{" "}
              de este repo.
            </li>
            <li>
              En <span className="text-foreground">Settings → API</span>, copiá el{" "}
              <span className="text-foreground">Project URL</span> y la{" "}
              <span className="text-foreground">anon public key</span>.
            </li>
            <li>
              Creá un archivo <code className="text-foreground">.env.local</code> en la raíz del
              proyecto (mirá <code className="text-foreground">.env.local.example</code>) con:
              <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
{`VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key`}
              </pre>
            </li>
            <li>Reiniciá el servidor de desarrollo (`npm run dev`).</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
