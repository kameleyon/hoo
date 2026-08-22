'use client';

import { useAccount } from './AccountProvider';

/** Keeps a card on the You screen. Renders nothing until storage has been read,
 *  so the label never flickers from "Save" to "Saved". */
export function SaveCardButton({ code, name }: { code: string; name: string }) {
  const { isSaved, toggleSaved, ready } = useAccount();
  const saved = isSaved(code);

  return (
    <button
      type="button"
      className="save-pill"
      aria-pressed={ready ? saved : undefined}
      onClick={() => toggleSaved(code)}
    >
      {!ready ? 'Save' : saved ? 'Saved' : 'Save'}
      <span className="visually-hidden"> {name}</span>
    </button>
  );
}
