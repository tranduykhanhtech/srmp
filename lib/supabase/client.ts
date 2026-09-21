import { createBrowserClient } from '@supabase/ssr';

export function getSupabaseKeys() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseKeys();
  return Boolean(
    url && 
    key && 
    url !== 'https://your-project.supabase.co' && 
    !url.includes('placeholder')
  );
}

export function createClient() {
  const { url, key } = getSupabaseKeys();
  return createBrowserClient(
    url || 'https://placeholder-url.supabase.co',
    key || 'placeholder-anon-key',
    {
      cookieOptions: {
        maxAge: 31536000, // 1 year persistent session
        sameSite: 'lax',
        path: '/',
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}

