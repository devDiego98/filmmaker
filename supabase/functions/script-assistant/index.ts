// Supabase Edge Function (Deno). Proxies the screenplay AI chat through Groq
// so the API key never reaches the browser. Deploy with:
//   supabase functions deploy script-assistant
//   supabase secrets set GROQ_API_KEY=gsk_...
// See CLAUDE.md for the full one-time setup.

import { createClient } from "npm:@supabase/supabase-js@2"
import Groq from "npm:groq-sdk"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const READ_ROLES = new Set(["admin", "director", "crew"])

// Mirrors ScreenplayElementType in src/features/script/screenplayExtension.ts
// (a separate Deno runtime — can't import from src/ directly).
const ELEMENT_TYPES = ["sceneHeading", "action", "character", "parenthetical", "dialogue", "transition"]

// Groq's chat completions API is OpenAI-compatible: no native structured-
// output schema like Anthropic's output_config.format, so the exact JSON
// shape is spelled out in the system prompt and enforced with
// response_format: { type: "json_object" } (valid JSON guaranteed, exact
// shape is not — parsing below is defensive about that).
const MODEL = "openai/gpt-oss-120b"

type ChatTurn = { role: "user" | "assistant"; content: string }

type RequestBody = {
  projectId: string
  documentText: string
  selectedText?: string
  history: ChatTurn[]
  userMessage: string
}

type SuggestedEditLine = { elementType: string; text: string }
type SuggestedEdit = { originalText: string; lines: SuggestedEditLine[]; explanation: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401)
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const body = (await req.json()) as RequestBody
    const { projectId, documentText, selectedText, history, userMessage } = body
    if (!projectId || !userMessage) {
      return json({ error: "projectId and userMessage are required" }, 400)
    }

    // Defense-in-depth: re-check the caller's project role server-side
    // (mirrors the "scriptDocument" read tier in src/lib/permissions.ts and
    // the script_document RLS policy), on top of the client hiding the chat
    // panel entirely for roles without access.
    const { data: role, error: roleError } = await supabase.rpc("project_role", {
      p_project_id: projectId,
    })
    if (roleError || !role || !READ_ROLES.has(role)) {
      return json({ error: "No tenés permiso de lectura sobre este proyecto." }, 403)
    }

    const groq = new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") })

    const selectionNote = selectedText
      ? `\n\nThe user has selected this exact excerpt and wants your suggestions scoped to it only:\n"""${selectedText}"""\nAny suggestedEdits you propose must have originalText be a substring of that excerpt.`
      : ""

    const system = `You are a screenwriting assistant embedded in a screenplay editor. The document uses standard industry screenplay elements — sceneHeading, action, character, parenthetical, dialogue, transition — so give craft-appropriate advice (pacing, subtext, formatting convention), not generic prose feedback. You have the full current document as context below, one line per element. When asked for advice, answer conversationally in "reply". When asked to change something, write new content, or continue the screenplay — including writing a whole scene from scratch on an empty document — also propose it via "suggestedEdits":
- "originalText": an exact, verbatim excerpt copied from the CURRENT document (above) that should be replaced. Use "" (empty string) when you are proposing brand-new content to append rather than replacing anything that already exists — never invent or paraphrase a quote that isn't really in the document.
- "lines": the proposed content as an array of properly-typed screenplay elements, e.g. a scene needs its own sceneHeading line, action line(s), character line before each dialogue line, etc. Each line is {"elementType": one of sceneHeading|action|character|parenthetical|dialogue|transition, "text": "..."}.
- "explanation": one sentence on why.
Don't propose edits the user didn't ask for or clearly want; an empty suggestedEdits array is fine for pure discussion.${selectionNote}

You must respond with ONLY a single JSON object, no markdown fences, no commentary outside it, matching exactly this shape:
{"reply": "string, same language the user wrote in", "suggestedEdits": [{"originalText": "string", "lines": [{"elementType": "sceneHeading|action|character|parenthetical|dialogue|transition", "text": "string"}], "explanation": "string"}]}

Current document (one line per element; empty means nothing written yet):
"""
${documentText || "(empty document)"}
"""`

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: system },
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user", content: userMessage },
    ]

    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages,
    })

    const choice = completion.choices[0]
    if (choice?.finish_reason === "content_filter") {
      return json({ error: "El asistente no pudo responder a ese pedido." }, 422)
    }

    const content = choice?.message?.content
    if (!content) {
      return json({ error: "Respuesta vacía del asistente." }, 502)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return json({ error: "El asistente devolvió una respuesta inválida." }, 502)
    }

    const result = parsed as { reply?: unknown; suggestedEdits?: unknown }
    if (typeof result.reply !== "string") {
      return json({ error: "El asistente devolvió una respuesta inválida." }, 502)
    }

    return json({ reply: result.reply, suggestedEdits: sanitizeSuggestedEdits(result.suggestedEdits) }, 200)
  } catch (error) {
    console.error("script-assistant error", error)
    return json({ error: "Error interno del asistente." }, 500)
  }
})

/** Defensively coerces the model's suggestedEdits into a shape the client
 * can trust — an LLM behind response_format: json_object has no guaranteed
 * schema, only guaranteed-valid JSON. */
function sanitizeSuggestedEdits(value: unknown): SuggestedEdit[] {
  if (!Array.isArray(value)) return []
  const edits: SuggestedEdit[] = []
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue
    const raw = item as Record<string, unknown>
    if (typeof raw.originalText !== "string" || typeof raw.explanation !== "string") continue
    if (!Array.isArray(raw.lines)) continue
    const lines: SuggestedEditLine[] = []
    for (const line of raw.lines) {
      if (typeof line !== "object" || line === null) continue
      const rawLine = line as Record<string, unknown>
      if (typeof rawLine.text !== "string") continue
      const elementType = ELEMENT_TYPES.includes(rawLine.elementType as string)
        ? (rawLine.elementType as string)
        : "action"
      lines.push({ elementType, text: rawLine.text })
    }
    if (lines.length === 0) continue
    edits.push({ originalText: raw.originalText, lines, explanation: raw.explanation })
  }
  return edits
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
