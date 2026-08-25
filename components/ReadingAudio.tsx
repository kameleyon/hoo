'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The narration, played where it sits.
 *
 * A bare link to the file hands the reader to the browser's own audio page,
 * which loses the reading they were looking at. This keeps playback on the
 * page and keeps the download a separate, deliberate act.
 *
 * The src is a route that checks the payment and redirects to a short-lived
 * signed link. The audio element follows that redirect itself, so nothing here
 * ever holds the real URL, and a link copied out of the page is worthless.
 */
function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ReadingAudio({
  src,
  downloadSrc,
  seconds,
}: {
  src: string;
  downloadSrc: string;
  /** Known from the file itself, so the bar is right before playback starts. */
  seconds: number | null;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [total, setTotal] = useState(seconds ?? 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => setAt(el.currentTime);
    const onMeta = () => Number.isFinite(el.duration) && setTotal(el.duration);
    const onEnd = () => {
      setPlaying(false);
      setAt(0);
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    el.addEventListener('waiting', () => setBusy(true));
    el.addEventListener('playing', () => setBusy(false));
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = async () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      setBusy(true);
      try {
        await el.play();
        setPlaying(true);
      } catch {
        // Autoplay policies and network failures both land here; the button
        // simply goes back to its resting state rather than lying about it.
        setPlaying(false);
      } finally {
        setBusy(false);
      }
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const scrub = (event: React.ChangeEvent<HTMLInputElement>) => {
    const el = ref.current;
    if (!el) return;
    const to = Number(event.target.value);
    el.currentTime = to;
    setAt(to);
  };

  return (
    <div className="player">
      <audio ref={ref} src={src} preload="metadata" />

      <button
        type="button"
        className="player__button"
        onClick={toggle}
        aria-label={playing ? 'Pause the narration' : 'Play the narration'}
      >
        {busy ? <span className="player__spinner" aria-hidden="true" /> : playing ? '❚❚' : '▶'}
      </button>

      <div className="player__middle">
        <input
          type="range"
          className="player__scrub"
          min={0}
          max={total || 1}
          step={1}
          value={at}
          onChange={scrub}
          aria-label="Position in the narration"
        />
        <div className="player__times">
          <span>{clock(at)}</span>
          <span>{clock(total)}</span>
        </div>
      </div>

      <a
        href={downloadSrc}
        className="player__download"
        aria-label="Download the narration"
        title="Download the narration"
      >
        ↓
      </a>
    </div>
  );
}
