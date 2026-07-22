// Supabase Edge Function (Deno). Sends a real "create your account and join
// this project" email to someone who doesn't have an account yet, via
// Supabase Auth's admin invite API — which needs the service-role key, so
// it must run here rather than in the browser. Deploy with:
//   supabase functions deploy invite-member
// No extra secret needed: SUPABASE_SERVICE_ROLE_KEY is auto-injected into
// every Edge Function. See CLAUDE.md for the Redirect URL setup this needs.

import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type RequestBody = {
  projectId: string
  email: string
  redirectTo: string
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    })

    const body = (await req.json()) as RequestBody
    const { projectId, email, redirectTo } = body
    if (!projectId || !email || !redirectTo) {
      return json({ error: "projectId, email and redirectTo are required" }, 400)
    }

    // Service-role calls below bypass RLS entirely, so this check is the
    // only thing standing between any authenticated user and inviting
    // arbitrary people into an arbitrary project — must match the
    // project_members_manage RLS policy (admin-only) exactly.
    const { data: role, error: roleError } = await supabaseUser.rpc("project_role", {
      p_project_id: projectId,
    })
    if (roleError || role !== "admin") {
      return json({ error: "Solo un admin puede invitar miembros." }, 403)
    }

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })

    if (inviteError) {
      // Expected, not a failure: this person already has an account and
      // will see the project via claim_project_invites() on their next
      // login — no email needed.
      if (/already registered|already exists|already been registered/i.test(inviteError.message)) {
        return json({ status: "already_registered" }, 200)
      }
      return json({ error: inviteError.message }, 502)
    }

    return json({ status: "invited" }, 200)
  } catch (error) {
    console.error("invite-member error", error)
    return json({ error: "Error interno al invitar." }, 500)
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
