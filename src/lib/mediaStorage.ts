import { supabase } from "./supabaseClient"
import { createId } from "./id"

/** Uploads to the public "media" bucket under `${projectId}/...` (see supabase/schema.sql
 * storage policies) and returns the public URL. */
export async function uploadMedia(projectId: string, file: File): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined
  const path = `${projectId}/${createId()}${ext ? `.${ext}` : ""}`
  const { error } = await supabase.storage.from("media").upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from("media").getPublicUrl(path)
  return data.publicUrl
}
