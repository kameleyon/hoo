'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSupabase } from './SupabaseProvider';
import { VOICES } from '@/lib/voices';

const BUCKET = 'lesson-media';

export interface EditableLesson {
  n: string;
  title: string;
  body: string;
  audio_path: string | null;
  pdf_path: string | null;
  access: 'free' | 'pro';
  published: boolean;
}

type Status = { kind: 'idle' | 'working' | 'done' | 'error'; message?: string };

/**
 * Writing a lesson and putting its media somewhere.
 *
 * Files go straight from this browser to Supabase Storage rather than through
 * our server: a narration can be a couple of hundred megabytes, and a Vercel
 * function will not take a body that size. The upload is authorised by the
 * editor's own session — the storage policy checks is_admin() — so nothing here
 * needs a service key.
 */
export function LessonEditor({ lesson }: { lesson: EditableLesson }) {
  const supabase = useSupabase();
  const router = useRouter();

  const [body, setBody] = useState(lesson.body);
  const [access, setAccess] = useState(lesson.access);
  const [published, setPublished] = useState(lesson.published);
  const [audioPath, setAudioPath] = useState(lesson.audio_path);
  const [pdfPath, setPdfPath] = useState(lesson.pdf_path);
  const [voice, setVoice] = useState<string>(VOICES[0].id);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  /**
   * Reads the *saved* body, not the textarea — so unsaved edits are never
   * silently narrated and then contradicted by what is on the page.
   */
  const generateNarration = async () => {
    setStatus({ kind: 'working', message: 'Reading the lesson aloud' });
    try {
      const response = await fetch('/api/lesson-media/narrate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ n: lesson.n, voice }),
      });
      const data: { path?: string; seconds?: number; characters?: number; error?: string } =
        await response.json();
      if (!response.ok || !data.path) throw new Error(data.error ?? 'narration failed');
      setAudioPath(data.path);
      setStatus({
        kind: 'done',
        message: `Narrated ${data.characters} characters, about ${Math.round((data.seconds ?? 0) / 60)} min`,
      });
      router.refresh();
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'narration failed',
      });
    }
  };

  const save = async () => {
    if (!supabase) return;
    setStatus({ kind: 'working', message: 'Saving' });

    const { error } = await supabase
      .from('lessons')
      .update({
        body,
        access,
        published_at: published ? new Date().toISOString() : null,
        audio_path: audioPath,
        pdf_path: pdfPath,
      })
      .eq('n', lesson.n);

    if (error) {
      setStatus({ kind: 'error', message: error.message });
      return;
    }
    setStatus({ kind: 'done', message: 'Saved' });
    router.refresh();
  };

  const upload = async (file: File, kind: 'audio' | 'pdf') => {
    if (!supabase) return;
    setStatus({ kind: 'working', message: `Uploading ${file.name}` });

    const extension = file.name.split('.').pop()?.toLowerCase() ?? (kind === 'pdf' ? 'pdf' : 'mp3');
    const path = `lessons/${lesson.n}/${kind}.${extension}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || undefined });

    if (error) {
      setStatus({ kind: 'error', message: error.message });
      return;
    }

    // Record the path immediately, so a browser closed mid-edit still leaves the
    // file attached rather than orphaned in the bucket.
    const column = kind === 'audio' ? { audio_path: path } : { pdf_path: path };
    const { error: linkError } = await supabase.from('lessons').update(column).eq('n', lesson.n);
    if (linkError) {
      setStatus({ kind: 'error', message: linkError.message });
      return;
    }

    if (kind === 'audio') setAudioPath(path);
    else setPdfPath(path);
    setStatus({ kind: 'done', message: `${file.name} uploaded` });
    router.refresh();
  };

  const remove = async (kind: 'audio' | 'pdf') => {
    if (!supabase) return;
    const path = kind === 'audio' ? audioPath : pdfPath;
    if (!path) return;

    setStatus({ kind: 'working', message: 'Removing' });
    await supabase.storage.from(BUCKET).remove([path]);
    await supabase
      .from('lessons')
      .update(kind === 'audio' ? { audio_path: null } : { pdf_path: null })
      .eq('n', lesson.n);

    if (kind === 'audio') setAudioPath(null);
    else setPdfPath(null);
    setStatus({ kind: 'done', message: 'Removed' });
    router.refresh();
  };

  return (
    <main className="view admin">
      <Link href="/admin/lessons" className="back">
        ← All lessons
      </Link>

      <p className="label label--tight">Lesson {lesson.n}</p>
      <h1 className="page-title">{lesson.title}</h1>

      <section className="section">
        <h2 className="label rule-under">The reading</h2>
        <p className="fineprint" style={{ textAlign: 'left', marginTop: 12 }}>
          Plain text. A blank line starts a new paragraph; a line beginning with{' '}
          <code>## </code> is a section heading. Nothing is read as HTML.
        </p>
        <textarea
          className="control admin__body"
          rows={22}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the lesson here."
        />
      </section>

      <section className="section">
        <h2 className="label rule-under">Audio and PDF</h2>

        <div className="admin__file">
          <div>
            <p className="label label--tight">Narration</p>
            <p className="admin__file-name">{audioPath ?? 'Nothing uploaded'}</p>
            <div className="admin__row" style={{ marginTop: 10 }}>
              <select
                className="control"
                style={{ width: 190 }}
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                aria-label="Narration voice"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: 'auto', paddingLeft: 18, paddingRight: 18 }}
                onClick={() => void generateNarration()}
                disabled={status.kind === 'working'}
              >
                {audioPath ? 'Re-read aloud' : 'Read aloud'}
              </button>
            </div>
          </div>
          <div className="admin__file-actions">
            <label className="btn-secondary admin__upload">
              {audioPath ? 'Replace' : 'Upload'}
              <input
                type="file"
                accept="audio/*"
                className="visually-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file, 'audio');
                }}
              />
            </label>
            {audioPath && (
              <button type="button" className="btn-secondary" onClick={() => void remove('audio')}>
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="admin__file">
          <div>
            <p className="label label--tight">PDF</p>
            <p className="admin__file-name">{pdfPath ?? 'Nothing uploaded'}</p>
          </div>
          <div className="admin__file-actions">
            <label className="btn-secondary admin__upload">
              {pdfPath ? 'Replace' : 'Upload'}
              <input
                type="file"
                accept="application/pdf"
                className="visually-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file, 'pdf');
                }}
              />
            </label>
            {pdfPath && (
              <button type="button" className="btn-secondary" onClick={() => void remove('pdf')}>
                Remove
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="label rule-under">Who can read it</h2>
        <div className="admin__row">
          <label className="field__label" htmlFor="access">
            Access
          </label>
          <select
            id="access"
            className="control control--day"
            style={{ width: 140 }}
            value={access}
            onChange={(e) => setAccess(e.target.value as 'free' | 'pro')}
          >
            <option value="free">Free</option>
            <option value="pro">Pro only</option>
          </select>
        </div>
        <div className="admin__row">
          <label className="field__label" htmlFor="published">
            Published
          </label>
          <input
            id="published"
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <span className="fineprint" style={{ margin: 0 }}>
            Unpublished lessons are visible only to you.
          </span>
        </div>
      </section>

      <div className="admin__save">
        <button
          type="button"
          className="btn-primary"
          onClick={() => void save()}
          disabled={status.kind === 'working'}
        >
          <span>{status.kind === 'working' ? 'Working' : 'Save the lesson'}</span>
        </button>
        <p className={`fineprint${status.kind === 'error' ? ' fineprint--error' : ''}`}>
          {status.message ?? 'Changes are live as soon as you save.'}
        </p>
        <Link href={`/learn/${lesson.n}`} className="set-birthday">
          View the lesson →
        </Link>
      </div>
    </main>
  );
}
