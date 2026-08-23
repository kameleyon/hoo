/**
 * Makes an existing account an editor.
 *
 *   node --env-file=.env.local scripts/grant-admin.mjs you@example.com
 *   node --env-file=.env.local scripts/grant-admin.mjs you@example.com --revoke
 *
 * `is_admin` is deliberately not settable from the app: the profiles UPDATE
 * policy limits a reader to their own row, and a trigger refuses any change to
 * that column, so the only way in is here with the secret key. Sign in once
 * first — this grants to an account that already exists.
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
const revoke = process.argv.includes('--revoke');

if (!email || !email.includes('@')) {
  console.error('Usage: node --env-file=.env.local scripts/grant-admin.mjs <email> [--revoke]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error('Missing SUPABASE_SECRET_KEY or the project URL.');
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });

// listUsers is paged; walk until the address turns up.
let user = null;
for (let page = 1; page <= 20 && !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error(`could not list users: ${error.message}`);
    process.exit(1);
  }
  if (!data.users.length) break;
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

if (!user) {
  console.error(`No account for ${email}. Sign in once at /sign-in, then run this again.`);
  process.exit(1);
}

const { error } = await admin
  .from('profiles')
  .update({ is_admin: !revoke })
  .eq('id', user.id);

if (error) {
  console.error(`could not update the profile: ${error.message}`);
  process.exit(1);
}

console.log(`${revoke ? 'Revoked' : 'Granted'} editor access for ${email}`);
console.log(revoke ? '' : 'They can now open /admin/lessons');
