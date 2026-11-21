import { createClient } from '@supabase/supabase-js'
import { catalogConfigured, catalogError, publishableKey, supabaseUrl } from './catalog-client.js'

const linkType = new URLSearchParams(window.location.hash.slice(1)).get('type')
export const isPasswordSetup = linkType === 'invite' || linkType === 'recovery'

export const supabase = catalogConfigured ? createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false },
}) : null

export async function staffRpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw catalogError(error)
  return data
}
