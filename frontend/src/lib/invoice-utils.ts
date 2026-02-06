/**
 * Shared helpers for auto-generated invoice and dispatch numbers.
 * Prefix rule: first letter of first name + first letter of last name;
 * if only one name, first letter + last letter of that name.
 */

/**
 * Get 2-letter prefix from a person's name (e.g. dealer, sub-dealer, factory admin).
 * - Two or more names: first letter of first name + first letter of last name (e.g. "Qaiser Javed" → "QJ").
 * - One name only: first letter + last letter (e.g. "Qaiser" → "Qr").
 * Fallback: "Sl" if name is empty.
 */
export function getDealerInvoicePrefix(dealerName: string | undefined): string {
  const parts = (dealerName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Sl';
  if (parts.length >= 2) {
    const first = (parts[0] || '').slice(0, 1);
    const last = (parts[parts.length - 1] || '').slice(0, 1);
    return (first + last).toUpperCase() || 'Sl';
  }
  const name = parts[0];
  const first = name.slice(0, 1);
  const end = name.slice(-1);
  return (first + end).toUpperCase() || 'Sl';
}
