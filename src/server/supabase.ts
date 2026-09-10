import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
export const supabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
export const supabaseAuthConfigured = () => Boolean(supabaseUrl() && supabaseAnonKey());

/**
 * Supabase client bound to the current request's cookies. Sessions live in httpOnly cookies managed by @supabase/ssr.
 * Server Components can't write cookies; the middleware refreshes tokens, so setAll failing there is expected.
 */
export async function createServerSupabase() {
  const store = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* called from a Server Component; middleware handles refresh */
        }
      },
    },
  });
}
