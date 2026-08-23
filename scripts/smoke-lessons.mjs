/**
 * Lessons end to end: markdown, narration text, and the Pro-gated PDF.
 *
 *   node --env-file=.env.local scripts/smoke-lessons.mjs [baseUrl]
 *
 * Signs in as a throwaway reader, then as a throwaway editor, and checks that
 * each of them can reach exactly what they should. Cleans up after itself.
 */
import { createClient } from '@supabase/supabase-js';

const base = process.argv[2] ?? 'http://localhost:3000';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error('Missing Supabase env.');
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const stamp = String(process.hrtime.bigint());
const created = [];

/** Sign in by minting a magic link and following it, keeping the cookies. */
async function sessionFor(email) {
  const { data: user, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  created.push(user.user.id);

  const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const res = await fetch(
    `${base}/auth/callback?token_hash=${link.properties.hashed_token}&type=magiclink`,
    { redirect: 'manual' },
  );
  const cookies = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  if (!cookies) throw new Error('no session cookie');
  return { id: user.user.id, cookies };
}

try {
  // --- the lesson itself ----------------------------------------------------
  {
    const html = await fetch(`${base}/learn/01`).then((r) => r.text());
    const { data: row } = await admin.from('lessons').select('body').eq('n', '01').single();

    // Assert on structure, not on prose — the author rewrites the body freely.
    const lines = (row?.body ?? '').split('\n');
    const firstProse = lines.find((l) => l.trim() && !l.startsWith('#'));
    const needle = (firstProse ?? '').replace(/[*_`]/g, '').trim().slice(0, 40);

    check('markdown is parsed, not printed', !/(^|>)#{1,3} /m.test(html) && !html.includes('**'));
    check('headings become elements', html.includes('lesson__heading'));
    check('the stored prose reaches the page', Boolean(needle) && html.includes(needle), needle);
    check(
      'the header shows a reading time and no lesson count',
      /min read/i.test(html) && !/of 50/i.test(html),
    );
  }

  // --- a signed-out visitor -------------------------------------------------
  {
    const res = await fetch(`${base}/api/lesson-media?n=01&kind=pdf`, { redirect: 'manual' });
    check('a signed-out visitor cannot download the PDF', res.status === 403, `HTTP ${res.status}`);
  }

  // --- a plain reader -------------------------------------------------------
  {
    const reader = await sessionFor(`smoke-reader-${stamp}@hausoforacle.test`);
    const res = await fetch(`${base}/api/lesson-media?n=01&kind=pdf`, {
      headers: { cookie: reader.cookies },
      redirect: 'manual',
    });
    check('a reader without Pro cannot download the PDF', res.status === 403, `HTTP ${res.status}`);

    const dl = await fetch(`${base}/api/lesson-media?n=01&kind=audio&download=1`, {
      headers: { cookie: reader.cookies },
      redirect: 'manual',
    });
    check('nor keep the audio', dl.status === 403 || dl.status === 404, `HTTP ${dl.status}`);

    const html = await fetch(`${base}/learn/01`, { headers: { cookie: reader.cookies } }).then((r) =>
      r.text(),
    );
    check('they are shown the button, disabled', html.includes('aria-disabled="true"'));
  }

  // --- an editor ------------------------------------------------------------
  {
    const editor = await sessionFor(`smoke-editor-${stamp}@hausoforacle.test`);
    await admin.from('profiles').update({ is_admin: true }).eq('id', editor.id);

    const res = await fetch(`${base}/api/lesson-media?n=01&kind=pdf`, {
      headers: { cookie: editor.cookies },
      redirect: 'manual',
    });
    const bytes = Buffer.from(await res.arrayBuffer());
    const isPdf = bytes.subarray(0, 5).toString() === '%PDF-';
    check(
      'an editor gets a real PDF',
      res.ok && isPdf,
      isPdf ? `${(bytes.length / 1024).toFixed(1)} KB` : `HTTP ${res.status}`,
    );
    check(
      'it is sent as a download with the lesson title',
      (res.headers.get('content-disposition') ?? '').includes('Dealt at birth'),
      res.headers.get('content-disposition') ?? '',
    );

    const list = await fetch(`${base}/admin/lessons`, { headers: { cookie: editor.cookies } });
    check('an editor can open the lesson admin', list.status === 200, `HTTP ${list.status}`);
  }

  // --- and a stranger cannot ------------------------------------------------
  {
    const res = await fetch(`${base}/admin/lessons`);
    check('a stranger gets 404 from the admin, not a redirect', res.status === 404, `HTTP ${res.status}`);
  }
} catch (error) {
  check('lesson smoke test ran to completion', false, error.message);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(`\ncleaned up ${created.length} test users`);
}

process.exit(failures === 0 ? 0 : 1);
