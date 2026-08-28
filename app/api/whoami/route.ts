import { NextResponse } from 'next/server';
import { readerIsAdmin, readerIsPro } from '@/lib/lesson-records';
import { currentUser } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

/**
 * What the server thinks of whoever is asking.
 *
 * The editor pages answer 404 rather than "you are not an editor", which is
 * right: an editor-only area should not confirm it exists. The cost is that a
 * real editor seeing a 404 cannot tell whether they lack the flag or whether
 * their session simply is not reaching the server, and those need opposite
 * fixes.
 *
 * This says which, and it is safe because it only ever describes the caller's
 * own session. Signed out, it reports nothing but "signed out".
 */
export async function GET() {
  if (!supabaseConfig()) {
    return NextResponse.json({ accounts: false, note: 'Supabase is not configured here.' });
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({
      signedIn: false,
      note: 'The server sees no session on this request. Sign in again at /sign-in; if you were signed in, the cookie is not reaching the server.',
    });
  }

  const [isAdmin, isPro] = await Promise.all([readerIsAdmin(), readerIsPro()]);

  return NextResponse.json({
    signedIn: true,
    email: user.email,
    isAdmin,
    isPro,
    note: isAdmin
      ? 'You are an editor. /admin/lessons will open.'
      : 'Signed in, but not an editor, so /admin/lessons answers 404 by design.',
  });
}
