/**
 * Proves the row-level security actually holds, rather than assuming it does.
 *
 *   node --env-file=.env.local scripts/smoke-supabase.mjs
 *
 * The one that matters: a signed-in reader must not be able to write
 * public.subscriptions. If they can, they can hand themselves Pro for free.
 *
 * Creates two throwaway users and deletes them at the end.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishable || !secret) {
  console.error('Missing Supabase env. Try: node --env-file=.env.local scripts/smoke-supabase.mjs');
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const stamp = process.env.SMOKE_STAMP ?? String(process.hrtime.bigint());
const mk = (who) => ({ email: `smoke-${who}-${stamp}@hausoforacle.test`, password: `Pw-${stamp}-${who}` });
const A = mk('a');
const B = mk('b');
const created = [];

async function makeUser({ email, password }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  created.push(data.user.id);
  return data.user;
}

async function signIn({ email, password }) {
  const client = createClient(url, publishable, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn: ${error.message}`);
  return client;
}

try {
  const userA = await makeUser(A);
  const userB = await makeUser(B);
  const clientA = await signIn(A);

  // --- the signup trigger ---------------------------------------------------
  {
    const { data } = await clientA.from('profiles').select('id, birthday, saved_cards').single();
    check('a profile is created automatically on signup', data?.id === userA.id);
    check('it starts with no birthday and no saved cards', data?.birthday === null && Array.isArray(data?.saved_cards) && data.saved_cards.length === 0);
  }

  // --- the reader owns their own settings ----------------------------------
  {
    const { error } = await clientA
      .from('profiles')
      .update({ birthday: '07-12', saved_cards: ['KH', '3D'] })
      .eq('id', userA.id);
    check('reader can set their own birthday and saved cards', !error, error?.message);
  }

  {
    const { error } = await clientA.from('profiles').update({ birthday: '13-45' }).eq('id', userA.id);
    check('an impossible birthday is rejected by the database', Boolean(error), error?.code);
  }

  {
    const { error } = await clientA.from('profiles').update({ saved_cards: ['NOPE'] }).eq('id', userA.id);
    check('a bogus card code is rejected by the database', Boolean(error), error?.code);
  }

  // --- isolation between readers -------------------------------------------
  {
    const { data } = await clientA.from('profiles').select('id').eq('id', userB.id);
    check("reader cannot see another reader's profile", (data ?? []).length === 0);
  }

  {
    const { error } = await clientA.from('profiles').update({ birthday: '01-01' }).eq('id', userB.id);
    const { data: after } = await admin.from('profiles').select('birthday').eq('id', userB.id).single();
    check("reader cannot edit another reader's profile", !error && after?.birthday === null);
  }

  // --- the one that matters -------------------------------------------------
  {
    const { error } = await clientA
      .from('subscriptions')
      .insert({ user_id: userA.id, status: 'active' });
    check('reader CANNOT grant themselves Pro by inserting', Boolean(error), error?.code);
  }

  {
    await admin.from('subscriptions').insert({ user_id: userA.id, status: 'inactive' });
    const { error } = await clientA
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('user_id', userA.id);
    const { data: after } = await admin
      .from('subscriptions')
      .select('status')
      .eq('user_id', userA.id)
      .single();
    check(
      'reader CANNOT upgrade themselves by updating',
      after?.status === 'inactive',
      error ? error.code : `status is now ${after?.status}`,
    );
  }

  {
    const { error } = await clientA.from('subscriptions').delete().eq('user_id', userA.id);
    const { count } = await admin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userA.id);
    check('reader CANNOT delete their billing row', count === 1, error?.code);
  }

  // --- but the webhook can, and the reader can read the result --------------
  {
    await admin.from('subscriptions').update({ status: 'trialing' }).eq('user_id', userA.id);
    const { data } = await clientA.from('subscriptions').select('status').single();
    check('the webhook (secret key) can grant Pro', data?.status === 'trialing');

    const { data: pro } = await clientA.rpc('is_pro');
    check('is_pro() reports true during a trial', pro === true);
  }

  {
    await admin.from('subscriptions').update({ status: 'canceled' }).eq('user_id', userA.id);
    const { data: pro } = await clientA.rpc('is_pro');
    check('is_pro() reports false once cancelled', pro === false);
  }

  // --- anonymous visitors ---------------------------------------------------
  {
    const anon = createClient(url, publishable, { auth: { persistSession: false } });
    const { data } = await anon.from('profiles').select('id');
    check('a signed-out visitor sees no profiles at all', (data ?? []).length === 0);
  }
} catch (error) {
  check('smoke test ran to completion', false, error.message);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(`\ncleaned up ${created.length} test users`);
}

process.exit(failures === 0 ? 0 : 1);
