import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Supabase environment variables are not configured.");
}

const parsedUrl = new URL(supabaseUrl);
if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
  throw new Error("Supabase must use HTTPS outside local development.");
}
if (/service_role|secret/i.test(supabasePublishableKey)) {
  throw new Error("A Supabase secret or service-role key must never be used in the browser.");
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
