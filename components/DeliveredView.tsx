import Link from 'next/link';
import type Stripe from 'stripe';
import { orderAssets } from '@/lib/fulfilment';
import { documentNames, reportById } from '@/lib/reports';

/**
 * The delivered document.
 *
 * A Checkout Session is the order record — it holds what was bought, what was
 * answered, and whether it was paid for — so this reads back from Stripe and
 * needs no database of its own.
 */
export function DeliveredView({ session }: { session: Stripe.Checkout.Session }) {
  const report = reportById(session.metadata?.reportId ?? '');

  if (!report) {
    return (
      <main className="view">
        <Link href="/reports" className="back">
          ← On demand
        </Link>
        <h1 className="page-title">We cannot read this order</h1>
        <p className="page-lede">
          It was paid for, but we no longer recognise the reading it was for. Get in touch and we
          will sort it out.
        </p>
      </main>
    );
  }

  const paid = session.payment_status !== 'unpaid';
  const assets = orderAssets(session);
  const delivered = Boolean(assets.pdfUrl || assets.audioUrl);
  const doc = documentNames(report);

  return (
    <main className="view">
      <Link href="/reports" className="back">
        ← On demand
      </Link>

      <div className="delivered">
        <div className="delivered__head">
          <p className="label label--wide">
            {!paid ? 'Payment pending' : delivered ? 'Ready' : 'Ordered'}
          </p>
          <h1 className="delivered__title">{report.title}</h1>
          <p className="delivered__specs">
            {report.pages} · {report.audio}
          </p>
        </div>

        <div className="delivered__files">
          <div className="delivered__file">
            <div className="filerow">
              <div className="filerow__pdf">PDF</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="filerow__name">{doc.pdfName}</p>
                <p className="filerow__sub">
                  {report.pages} · {doc.pdfSize}
                </p>
              </div>
              {assets.pdfUrl ? (
                <a href={assets.pdfUrl} download className="filerow__action">
                  Download
                </a>
              ) : (
                <span className="filerow__action filerow__action--idle">
                  {paid ? 'Writing' : 'Pending'}
                </span>
              )}
            </div>
          </div>

          <div className="delivered__divider" />

          <div className="delivered__file">
            <div className="filerow">
              {assets.audioUrl ? (
                <a href={assets.audioUrl} className="filerow__play" aria-label="Play the narration">
                  ▶
                </a>
              ) : (
                <span className="filerow__play filerow__play--idle" aria-hidden="true">
                  ▶
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="filerow__name">{doc.mp3Name}</p>
                <div className="filerow__track">
                  <div className="filerow__fill" />
                </div>
              </div>
              <span className="filerow__sub" style={{ flex: 'none', marginTop: 0 }}>
                {doc.mp3Len}
              </span>
            </div>
          </div>
        </div>

        {!delivered && (
          <p className="fineprint" style={{ textAlign: 'left', marginTop: 16 }}>
            {paid
              ? `${report.turn}. Both files are emailed to ${session.customer_details?.email ?? 'you'} the moment the reading is written.`
              : 'Your payment method takes a little while to settle. Nothing is written until it clears — we will email you either way.'}
          </p>
        )}

        <section className="section delivered__inside">
          <h2 className="label label--wide rule-under">Inside</h2>
          <p className="section__body">{report.inside}</p>
        </section>

        <div className="delivered__actions">
          <Link href="/reports" className="btn-secondary">
            Order another
          </Link>
          {assets.pdfUrl ? (
            <a href={`mailto:?subject=${encodeURIComponent(report.title)}`} className="btn-dark">
              Email a copy
            </a>
          ) : (
            <span className="btn-dark btn-dark--idle">Email a copy</span>
          )}
        </div>
      </div>
    </main>
  );
}
