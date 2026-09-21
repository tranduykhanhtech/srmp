import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const targetRedirectUrl = isLocalEnv
    ? `${origin}${next}`
    : forwardedHost
    ? `https://${forwardedHost}${next}`
    : `${origin}${next}`;

  if (code) {
    let response = NextResponse.redirect(targetRedirectUrl);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '';

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get('cookie') || '';
          return cookieHeader
            .split(';')
            .filter(Boolean)
            .map((c) => {
              const [name, ...val] = c.trim().split('=');
              return { name, value: val.join('=') };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              maxAge: 31536000, // 1 year persistent cookie
              sameSite: 'lax',
              path: '/',
            });
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    } else {
      console.error('exchangeCodeForSession error:', error.message);
    }
  }

  // Return the user to an error page or home with an error parameter
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
