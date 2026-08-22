'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getOrder, orderAssets } from '@/lib/orders';
import type { Order } from '@/lib/orders';
import { documentNames, reportById } from '@/lib/reports';

export function DeliveredView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    setOrder(getOrder(orderId) ?? null);
  }, [orderId]);

  if (order === undefined) {
    return <main className="view" aria-busy="true" />;
  }

  if (order === null) {
    return (
      <main className="view">
        <Link href="/reports" className="back">
          ← On demand
        </Link>
        <h1 className="page-title">No such order</h1>
        <p className="page-lede">
          This order was placed on another device, or the browser has since forgotten it.
        </p>
      </main>
    );
  }

  const report = reportById(order.reportId);
  if (!report) notFound();

  const doc = documentNames(report);
  const assets = orderAssets(order);
  const delivered = Boolean(assets.pdfUrl || assets.audioUrl);

  return (
    <main className="view">
      <Link href="/reports" className="back">
        ← On demand
      </Link>

      <div className="delivered">
        <div className="delivered__head">
          <p className="label label--wide">{delivered ? 'Ready' : 'Ordered'}</p>
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
                <button type="button" className="filerow__action" disabled>
                  Preparing
                </button>
              )}
            </div>
          </div>

          <div className="delivered__divider" />

          <div className="delivered__file">
            <div className="filerow">
              {assets.audioUrl ? (
                <button type="button" className="filerow__play" aria-label="Play the narration">
                  ▶
                </button>
              ) : (
                <button
                  type="button"
                  className="filerow__play"
                  disabled
                  aria-label="Narration not ready yet"
                >
                  ▶
                </button>
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
            {report.turn}. We will email both files to you as soon as the reading is written.
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
          {delivered ? (
            <a href={`mailto:?subject=${encodeURIComponent(report.title)}`} className="btn-dark">
              Email a copy
            </a>
          ) : (
            <button type="button" className="btn-dark" disabled>
              Email a copy
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
