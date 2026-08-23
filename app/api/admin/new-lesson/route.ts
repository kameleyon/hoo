import { NextResponse } from 'next/server';
import { readerIsAdmin } from '@/lib/lesson-records';
import { nextFreeLesson } from '@/lib/lesson-slots';

/** Opens a blank article for an editor. 404 to anyone who is not one. */
export async function POST() {
  if (!(await readerIsAdmin())) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  try {
    const n = await nextFreeLesson();
    return NextResponse.json({ n, edit: `/admin/lessons/${n}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'could not start a new article';
    console.error('new lesson —', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
