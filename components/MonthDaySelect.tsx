// Rendered only from client components — it inherits the client boundary from
// them, so it deliberately carries no "use client" directive of its own.
import { DAYS_IN_MONTH, MONTHS, dayKey, parseDayKey } from '@/lib/cardology';
import type { DayKey } from '@/lib/types';

/**
 * Month and day, no year — a date returns the same card whichever year it fell
 * in. Changing to a shorter month clamps the day rather than producing an
 * impossible date.
 */
export function MonthDaySelect({
  value,
  onChange,
  idPrefix,
  label,
}: {
  value: DayKey;
  onChange: (next: DayKey) => void;
  idPrefix: string;
  label: string;
}) {
  const parsed = parseDayKey(value) ?? { month: 0, day: 1 };

  const setMonth = (month: number) => {
    onChange(dayKey(month, Math.min(parsed.day, DAYS_IN_MONTH[month])));
  };

  return (
    <>
      <label htmlFor={`${idPrefix}-month`} className="visually-hidden">
        {label} — month
      </label>
      <select
        id={`${idPrefix}-month`}
        className="control control--month"
        value={parsed.month}
        onChange={(e) => setMonth(Number(e.target.value))}
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i}>
            {m}
          </option>
        ))}
      </select>

      <label htmlFor={`${idPrefix}-day`} className="visually-hidden">
        {label} — day
      </label>
      <select
        id={`${idPrefix}-day`}
        className="control control--day"
        value={parsed.day}
        onChange={(e) => onChange(dayKey(parsed.month, Number(e.target.value)))}
      >
        {Array.from({ length: DAYS_IN_MONTH[parsed.month] }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </>
  );
}
