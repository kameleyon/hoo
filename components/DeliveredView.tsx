import Link from 'next/link';
import type Stripe from 'stripe';
import { OrderPoller } from './OrderPoller';
import { orderAssets, orderStatus } from '@/lib/fulfilment';
import { documentNames, reportById } from '@/lib/reports';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="view">
      <Link href="/reports" className="back">
        ← On demand
      </Link>
      {children}
    </main>
  );
}

/**
 * The delivered document.
 *
 * A Checkout Session is the order record: it holds what was bought, what was
 * answered, and whether it was paid for, so this reads back from Stripe and
 * needs no database of its own.
 *
 * The rule this file follows is that nothing is stated about a file until the
 * file exists. A page count, a size, a running time and a delivery promise are
 * all claims, and making them about something unwritten is how a reader ends
 * up believing they were sent something they never received.
 */
export function DeliveredView({ session }: { session: Stripe.Checkout.Session }) {
  const report = reportById(session.metadata?.reportId ?? '');

  if (!report) {
    return (
      <Shell>
        <h1 className="page-title">We cannot read this order</h1>
        <p className="page-lede">
          It was paid for, but we no longer recognise the reading it was for. Get in touch and we
          will sort it out.
        </p>
      </Shell>
    );
  }

  const { state, waitedMinutes } = orderStatus(session);

  // The reading is what was bought, so an unpaid session is not shown one. It
  // gets the truth about its own payment and nothing else.
  if (state === 'unpaid') {
    return (
      <Shell>
        <h1 className="page-title">Payment has not cleared</h1>
        <p className="page-lede">
          Your payment method is still settling. Nothing is written until it clears, and we will
          email you either way. You have not been charged twice by reloading this page.
        </p>
        <div className="delivered__actions" style={{ marginTop: 24 }}>
          <Link href={`/reports/${report.id}`} className="btn-secondary">
            Back to the report
          </Link>
        </div>
        <OrderPoller active={state === 'unpaid'} />
      </Shell>
    );
  }

  const assets = orderAssets(session);
  const doc = documentNames(report);
  const ready = state === 'ready';
  const email = session.customer_details?.email;

  return (
    <Shell>
      <div className="delivered">
        <div className="delivered__head">
          <p className="label label--wide">{ready ? 'Ready' : 'Paid'}</p>
          <h1 className="delivered__title">{report.title}</h1>
          {ready && (
            <p className="delivered__specs">
              {report.pages} · {report.audio}
            </p>
          )}
        </div>

        <div className="delivered__files">
          <div className="delivered__file">
            <div className="filerow">
              <div className="filerow__pdf">PDF</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="filerow__name">{doc.pdfName}</p>
                {ready && <p className="filerow__sub">{report.pages}</p>}
              </div>
              {assets.pdfUrl ? (
                <a href={assets.pdfUrl} download className="filerow__action">
                  Download
                </a>
              ) : (
                <span className="filerow__action filerow__action--idle">
                  <span className="working">
                    Writing
                    <span className="working__dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
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
                  <div className={ready ? 'filerow__fill' : 'filerow__fill filerow__fill--idle'} />
                </div>
              </div>
              {ready && (
                <span className="filerow__sub" style={{ flex: 'none', marginTop: 0 }}>
                  {doc.mp3Len}
                </span>
              )}
            </div>
          </div>
        </div>

        {state === 'writing' && (
          <p className="fineprint" style={{ textAlign: 'left', marginTop: 16 }} aria-live="polite">
            {report.turn}. This page updates itself, so you can leave it open.
            {email ? ` Both files go to ${email} as soon as they exist.` : ''}
          </p>
        )}

        {state === 'late' && (
          <p
            className="fineprint fineprint--error"
            style={{ textAlign: 'left', marginTop: 16 }}
            role="alert"
          >
            This has been {waitedMinutes} minutes, which is longer than it should take. Your payment
            is safe and your answers are saved. If it has not arrived shortly, reply to your receipt
            and we will either finish it or refund you.
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

      <OrderPoller active={state === 'writing'} />
    </Shell>
  );
}
