import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Where the emailed link lands. Exchanges the one-time code for a session,
 * sets the cookies, then sends the reader on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  // Only ever redirect within this app — never to whatever the link asked for.
  const next = searchParams.get('next');
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/you';

  const supabase = await supabaseServer();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, origin));
    console.error('auth callback: could not exchange code —', error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink' | 'email' | 'signup' | 'recovery' | 'invite',
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(new URL(destination, origin));
    console.error('auth callback: could not verify token —', error.message);
  }

  return NextResponse.redirect(new URL('/sign-in?error=link', origin));
}
