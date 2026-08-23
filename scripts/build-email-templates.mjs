/**
 * Writes supabase/templates/*.html — the auth emails, in the app's own voice.
 *
 *   npm run email:build      then    npm run config:push
 *
 * One layout, five bodies. Written by a generator rather than by hand because
 * five near-identical HTML files drift apart the moment one of them is edited.
 *
 * Email HTML is not web HTML: no stylesheet, no web fonts, no flexbox that can
 * be relied on. Everything is inline, the layout is a table, and the typefaces
 * fall back to Georgia — Instrument Serif and Newsreader will not load in a mail
 * client, and a serif that ships everywhere is closer to the app than the
 * sans-serif default would be.
 *
 * Supabase substitutes: {{ .ConfirmationURL }} {{ .Token }} {{ .Email }} {{ .SiteURL }}
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'supabase/templates');

const INK = '#0E1A2E';
const SURFACE = '#F5F4F1';
const PANEL = '#FBFAF8';
const LINE = '#DEDBD5';
const MUTED = '#6C6A65';
const MUTED_3 = '#9A978F';
const BODY_INK = '#2B3444';

const DISPLAY = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/** The one-time code, shown for readers whose mail client mangles links. */
const codeBlock = (label) => `
            <div style="padding-top:26px;">
              <div style="font-family:${SANS};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${MUTED_3};padding-bottom:10px;">${label}</div>
              <div style="font-family:${DISPLAY};font-size:30px;letter-spacing:0.18em;color:${INK};">{{ .Token }}</div>
            </div>`;

function layout({ heading, lede, action, closing, withCode }) {
  const button = action
    ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="padding-top:28px;">
              <tr>
                <td style="background:${INK};border-radius:6px;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:16px 28px;font-family:${SANS};font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${SURFACE};text-decoration:none;">${action}</a>
                </td>
              </tr>
            </table>`
    : '';
  const fallback = action
    ? `
            <div style="border-top:1px solid ${LINE};margin-top:28px;padding-top:18px;">
              <div style="font-family:${SANS};font-size:11px;line-height:1.7;color:${MUTED_3};">
                If the button does not work, paste this into your browser:<br>
                <span style="color:#1B4079;word-break:break-all;">{{ .ConfirmationURL }}</span>
              </div>
            </div>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:${SURFACE};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SURFACE};">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${PANEL};border:1px solid ${LINE};border-radius:8px;">
        <tr>
          <td style="padding:36px 36px 40px;">

            <div style="font-family:${SANS};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#3A4658;padding-bottom:26px;">Haus&nbsp;of&nbsp;Oracle</div>

            <div style="font-family:${DISPLAY};font-size:34px;line-height:1.1;color:${INK};">${heading}</div>

            <div style="font-family:${DISPLAY};font-size:17px;line-height:1.6;color:${BODY_INK};padding-top:14px;">${lede}</div>

${button}
${withCode ? codeBlock(action ? 'Or enter this code' : 'Your code') : ''}
            <div style="font-family:${DISPLAY};font-size:15px;line-height:1.6;color:${MUTED};padding-top:28px;">${closing}</div>
${fallback}

          </td>
        </tr>
      </table>

      <div style="font-family:${SANS};font-size:11px;line-height:1.7;color:${MUTED_3};padding-top:22px;max-width:520px;">
        Sent to {{ .Email }} because someone asked to sign in to Haus of Oracle.<br>
        If that was not you, ignore this — nothing happens until the link is opened.
      </div>

    </td>
  </tr>
</table>
</body>
</html>
`;
}

const TEMPLATES = {
  magic_link: {
    subject: 'Your link to Haus of Oracle',
    heading: 'Your way in',
    lede: 'Open this and you are signed in. No password to remember, and the link only works once.',
    action: 'Sign me in',
    closing: 'The link is good for one hour.',
    withCode: true,
  },
  confirmation: {
    subject: 'Confirm your email — Haus of Oracle',
    heading: 'One tap and you are in',
    lede: 'Confirm this address and your birthday and saved cards will follow you between devices.',
    action: 'Confirm my email',
    closing: 'A card a day stays free, with or without an account.',
    withCode: true,
  },
  recovery: {
    subject: 'Reset your password — Haus of Oracle',
    heading: 'Set a new password',
    lede: 'Open this to choose a new password. Your cards and your birthday are untouched.',
    action: 'Choose a new password',
    closing: 'If you did not ask for this, your account is fine — ignore this email.',
    withCode: true,
  },
  email_change: {
    subject: 'Confirm your new email — Haus of Oracle',
    heading: 'Confirm the change',
    lede: 'Confirm this address and it becomes the one you sign in with from now on.',
    action: 'Confirm this address',
    closing: 'Until you confirm, the old address still works.',
    withCode: true,
  },
  reauthentication: {
    subject: 'Your confirmation code — Haus of Oracle',
    heading: 'Confirm it is you',
    lede: 'Enter this code to finish what you started.',
    action: null,
    closing: 'The code is good for one hour.',
    withCode: true,
  },
};

mkdirSync(out, { recursive: true });
for (const [name, spec] of Object.entries(TEMPLATES)) {
  const html = layout(spec);
  writeFileSync(resolve(out, `${name}.html`), html);
  console.log(`${name.padEnd(18)} ${String(html.length).padStart(5)} bytes  "${spec.subject}"`);
}

console.log('\nNow run: npm run config:push');
