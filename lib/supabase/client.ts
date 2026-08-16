import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isConfigured = Boolean(rawUrl && rawKey);

if (!isConfigured && typeof window !== "undefined") {
  console.warn("Supabase environment variables are not configured.");
}

const supabaseUrl = rawUrl || "https://placeholder.supabase.co";
const supabasePublishableKey = rawKey || "sb_publishable_placeholder";

if (isConfigured) {
  const parsedUrl = new URL(supabaseUrl);
  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
    throw new Error("Supabase must use HTTPS outside local development.");
  }
  if (/service_role|secret/i.test(supabasePublishableKey)) {
    throw new Error("A Supabase secret or service-role key must never be used in the browser.");
  }
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

