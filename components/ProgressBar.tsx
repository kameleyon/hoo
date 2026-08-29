'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A progress bar anchored to real work, moving between the anchors.
 *
 * The server knows exactly three things for certain: the reading is written,
 * the PDF is rendered, the narration exists. Those are the milestones, and
 * they are far apart: writing alone runs a minute and a half, during which a
 * milestone-only bar sits perfectly still and looks broken.
 *
 * So between milestones it eases toward the next one and never arrives. The
 * curve is asymptotic, meaning it slows as it approaches the ceiling and can
 * never claim work that has not happened. When the real milestone lands, the
 * server sends a higher floor and the bar steps up to it.
 *
 * The honesty rule: the bar may drift within a stage, but only a completed
 * stage can move it past that stage's ceiling.
 */
export function ProgressBar({
  from,
  to,
  elapsed,
  expected,
  label,
}: {
  /** The milestone already reached. Never drift below this. */
  from: number;
  /** The next milestone. Approach, never reach. */
  to: number;
  /** Seconds already spent in this stage when the page rendered. */
  elapsed: number;
  /** Roughly how long this stage takes. */
  expected: number;
  label: string;
}) {
  const [value, setValue] = useState(from);
  // Wall-clock at mount, so a page left open keeps counting correctly rather
  // than restarting the curve on every re-render.
  const started = useRef(Date.now() - elapsed * 1000);

  useEffect(() => {
    started.current = Date.now() - elapsed * 1000;
  }, [elapsed, from]);

  useEffect(() => {
    if (from >= 100) {
      setValue(100);
      return;
    }

    const tick = () => {
      const seconds = (Date.now() - started.current) / 1000;
      // 1 - e^(-t/T) reaches about 63% of the gap at the expected time and
      // keeps slowing after, so a slow stage still moves and a stalled one
      // visibly flattens instead of pretending to finish.
      const eased = 1 - Math.exp(-seconds / Math.max(1, expected * 0.6));
      setValue(Math.min(to, from + (to - from) * eased));
    };

    tick();
    const id = setInterval(tick, 400);
    return () => clearInterval(id);
  }, [from, to, expected]);

  const shown = Math.round(value);

  return (
    <span
      className="progress"
      role="progressbar"
      aria-valuenow={shown}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      data-value={shown}
    >
      <span className="progress__fill" style={{ width: `${value}%` }} />
    </span>
  );
}

/** The same number, for the row that prints it beside the bar. */
export function ProgressLabel(props: {
  from: number;
  to: number;
  elapsed: number;
  expected: number;
}) {
  const [value, setValue] = useState(props.from);
  const started = useRef(Date.now() - props.elapsed * 1000);

  useEffect(() => {
    started.current = Date.now() - props.elapsed * 1000;
  }, [props.elapsed, props.from]);

  useEffect(() => {
    if (props.from >= 100) {
      setValue(100);
      return;
    }
    const tick = () => {
      const seconds = (Date.now() - started.current) / 1000;
      const eased = 1 - Math.exp(-seconds / Math.max(1, props.expected * 0.6));
      setValue(Math.min(props.to, props.from + (props.to - props.from) * eased));
    };
    tick();
    const id = setInterval(tick, 400);
    return () => clearInterval(id);
  }, [props.from, props.to, props.expected]);

  return <>{Math.round(value)}%</>;
}
