'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Starts an article that is not in the course outline.
 *
 * The slot is chosen on the server — the lowest empty one, or a new number past
 * the end — so two editors pressing this at once cannot land on the same row.
 */
export function NewLessonButton() {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/new-lesson', { method: 'POST' });
      const data: { edit?: string; error?: string } = await res.json();
      if (!res.ok || !data.edit) throw new Error(data.error ?? 'could not start a new article');
      router.push(data.edit as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'could not start a new article');
      setWorking(false);
    }
  };

  return (
    <>
      <button type="button" className="btn-primary admin__new" onClick={() => void start()} disabled={working}>
        <span>{working ? 'Opening' : 'Write a new article'}</span>
      </button>
      {error && (
        <p className="fineprint fineprint--error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
