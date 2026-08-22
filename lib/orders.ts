import type { DayKey } from './types';

export interface Order {
  id: string;
  reportId: string;
  /** Date fields hold a "MM-DD" key; text fields hold their raw string. */
  values: Record<string, string>;
  createdAt: string;
}

const STORAGE_KEY = 'hoo.orders';

function read(): Order[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

function write(orders: Order[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Storage blocked — the order still exists for this page view.
  }
}

export function createOrder(reportId: string, values: Record<string, string>): Order {
  const order: Order = {
    id: crypto.randomUUID(),
    reportId,
    values,
    createdAt: new Date().toISOString(),
  };
  write([order, ...read()].slice(0, 50));
  return order;
}

export function getOrder(id: string): Order | undefined {
  return read().find((o) => o.id === id);
}

export function listOrders(): Order[] {
  return read();
}

export interface OrderAssets {
  pdfUrl: string | null;
  audioUrl: string | null;
}

/**
 * Where the written document and its narration come from.
 *
 * Producing them is a server job — take the reader's cards, write the study,
 * render the PDF, narrate it — and that service is not connected yet. Until it
 * is, this returns nothing and the delivered view says so plainly rather than
 * offering a download that would fail.
 */
export function orderAssets(_order: Order): OrderAssets {
  return { pdfUrl: null, audioUrl: null };
}

/** The "MM-DD" values on an order, for reading the cards behind it. */
export function orderDates(order: Order, keys: string[]): DayKey[] {
  return keys.map((k) => order.values[k]).filter((v): v is DayKey => Boolean(v));
}
