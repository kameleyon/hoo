import { TodayView } from '@/components/TodayView';

/**
 * The card of the day changes at midnight in the reader's own timezone, so this
 * page is rendered per request rather than cached — the server's timestamp is
 * only the seed for the client clock.
 */
export const dynamic = 'force-dynamic';

export default function TodayPage() {
  return <TodayView serverNow={new Date().toISOString()} />;
}
