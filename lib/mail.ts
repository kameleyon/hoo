import 'server-only';
import { siteUrl } from './site';

/**
 * Outgoing mail.
 *
 * Auth mail already goes out through Resend, as Supabase's SMTP, from the
 * hausoforacle.com domain. This sends directly on the same verified domain for
 * everything the app itself has to say.
 *
 * Never from a noreply address. A reader who replies to say a file will not
 * open should reach a person, and Resend will not accept the bounce-only
 * addresses people reach for anyway.
 */
const ENDPOINT = 'https://api.resend.com/emails';
const FROM = 'Haus of Oracle <readings@hausoforacle.com>';
const REPLY_TO = 'hello@hausoforacle.com';

export class MailNotConfigured extends Error {}

interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function send({ to, subject, html, text }: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new MailNotConfigured('RESEND_API_KEY is not set');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html, text, reply_to: REPLY_TO }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend refused the send: ${response.status} ${detail.slice(0, 200)}`);
  }
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * "Your reading is ready."
 *
 * The mail links to the order page rather than carrying the files. A signed
 * file link lasts half an hour, so attaching one would produce a message that
 * is broken by the time most people open it; the order page re-checks the
 * payment and mints a fresh link on every visit, which means this email keeps
 * working for as long as the order does.
 */
export function readyEmail(reportTitle: string, orderUrl: string, subtitle: string) {
  const url = escape(orderUrl);
  const title = escape(reportTitle);

  const text = [
    `${reportTitle} is ready.`,
    '',
    subtitle,
    '',
    `Read it here: ${orderUrl}`,
    '',
    'The page has the PDF to download and the narration to play. Keep this link;',
    'it stays valid, and nothing else is needed to open it.',
    '',
    'Haus of Oracle',
    siteUrl(),
  ].join('\n');

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#F5F4F1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FBFAF8;border:1px solid #E4E1DB;border-radius:6px;">
        <tr><td style="padding:30px 32px 0;">
          <p style="margin:0 0 26px;font:600 10px/1 Helvetica,Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#3A4658;">Haus of Oracle</p>
          <h1 style="margin:0 0 12px;font:400 26px/1.2 Georgia,'Times New Roman',serif;color:#0E1A2E;">${title} is ready</h1>
          <p style="margin:0 0 24px;font:400 16px/1.6 Georgia,'Times New Roman',serif;color:#2B3444;">${escape(subtitle)}</p>
          <a href="${url}" style="display:inline-block;background:#1B4079;color:#F5F4F1;font:600 12px/1 Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;padding:14px 22px;border-radius:3px;text-decoration:none;">Open your reading</a>
          <p style="margin:24px 0 0;font:400 14px/1.6 Georgia,'Times New Roman',serif;color:#6C6A65;">The page has the PDF to download and the narration to play. Keep this link, it stays valid.</p>
        </td></tr>
        <tr><td style="padding:26px 32px 30px;">
          <p style="margin:0;border-top:1px solid #EDEAE4;padding-top:16px;font:400 12px/1.5 Helvetica,Arial,sans-serif;color:#9A978F;">
            Sent because you ordered a reading at hausoforacle.com. Reply to this message if anything is wrong with it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject: `${reportTitle} is ready`, html, text };
}
