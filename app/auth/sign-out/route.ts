import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * POST only. A GET sign-out can be fired by any `<img>` on any page the reader
 * happens to visit, which makes signing people out a one-line prank.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/you', request.url), { status: 303 });
}
