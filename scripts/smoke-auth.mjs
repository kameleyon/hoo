/**
 * End-to-end check of the sign-in flow, without anyone receiving an email.
 *
 *   node --env-file=.env.local scripts/smoke-auth.mjs [baseUrl]
 *
 * Two things are proved here:
 *
 *   1. The magic-link callback actually signs someone in — the link is
 *      generated through the admin API (which returns it instead of sending
 *      it), then followed against the running app to see whether a session
 *      cookie comes back.
 *   2. Supabase can really send through Resend. `delivered@resend.dev` is
 *      Resend's simulated inbox: the send is real, the delivery is not, so no
 *      human is emailed and a broken SMTP password still surfaces as an error.
 */
import { createClient } from '@supabase/supabase-js';

const base = process.argv[2] ?? 'http://localhost:3000';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishable || !secret) {
  console.error('Missing Supabase env. Try: node --env-file=.env.local scripts/smoke-auth.mjs');
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const stamp = String(process.hrtime.bigint());
const email = `smoke-auth-${stamp}@hausoforacle.test`;
const created = [];

try {
  // --- the callback route signs someone in ---------------------------------
  const { data: user, error: userError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (userError) throw new Error(`createUser: ${userError.message}`);
  created.push(user.user.id);

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError) throw new Error(`generateLink: ${linkError.message}`);
  check('a magic link can be minted for a reader', Boolean(link.properties?.hashed_token));

  const callback = `${base}/auth/callback?token_hash=${link.properties.hashed_token}&type=magiclink&next=/you`;
  const response = await fetch(callback, { redirect: 'manual' });
  const location = response.headers.get('location') ?? '';
  const cookies = response.headers.getSetCookie?.() ?? [];

  check(
    'following the link redirects to You, not back to sign-in',
    location.endsWith('/you'),
    location || `HTTP ${response.status}`,
  );
  check(
    'following the link sets a session cookie',
    cookies.some((c) => c.startsWith('sb-')),
    `${cookies.length} cookies set`,
  );

  // --- a bad link is refused ------------------------------------------------
  {
    const bad = await fetch(`${base}/auth/callback?token_hash=nonsense&type=magiclink`, {
      redirect: 'manual',
    });
    check(
      'a forged link does not sign anyone in',
      (bad.headers.get('location') ?? '').includes('/sign-in'),
      bad.headers.get('location') ?? '',
    );
  }

  // --- open redirect --------------------------------------------------------
  {
    const { data: link2 } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const evil = await fetch(
      `${base}/auth/callback?token_hash=${link2.properties.hashed_token}&type=magiclink&next=https://evil.example.com`,
      { redirect: 'manual' },
    );
    const to = evil.headers.get('location') ?? '';
    check('the callback refuses to redirect off-site', !to.includes('evil.example.com'), to);
  }

  // --- Supabase -> Resend ---------------------------------------------------
  {
    const anon = createClient(url, publishable, { auth: { persistSession: false } });
    const { error } = await anon.auth.signInWithOtp({
      email: 'delivered@resend.dev',
      options: { emailRedirectTo: `${base}/auth/callback` },
    });
    check('Supabase can send auth mail through Resend', !error, error?.message);

    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    const test = list?.users?.find((u) => u.email === 'delivered@resend.dev');
    if (test) created.push(test.id);
  }
} catch (error) {
  check('auth smoke test ran to completion', false, error.message);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(`\ncleaned up ${created.length} test users`);
}

process.exit(failures === 0 ? 0 : 1);
