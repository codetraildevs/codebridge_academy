/**
 * Format a price value. Returns 'Free' for zero prices.
 */
export function formatPrice(price: number, currency: string): string {
  if (price === 0) return 'Free';
  return `${currency === 'RWF' ? 'RWF' : ''} ${price.toLocaleString()}`;
}

/**
 * Get a human-readable billing cycle label.
 */
export function getBillingLabel(cycle: string): string {
  switch (cycle) {
    case 'MONTHLY': return '/month';
    case 'ANNUAL': return '/year';
    case 'QUARTERLY': return '/quarter';
    case 'PER_EXAM': return '/exam';
    default: return '';
  }
}

/**
 * Format a date string to a human-readable format.
 */
export function formatDate(date: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '';
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: 'long', day: 'numeric',
  };
  return new Date(date).toLocaleDateString('en-US', options || defaultOptions);
}

/**
 * Format a date as a short relative time: "just now", "5m ago", "2h ago",
 * "3d ago", "2mo ago", "1y ago". Returns '' for empty or invalid input.
 */
export function timeAgo(date: string | number | Date | null | undefined): string {
  if (!date) return '';
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Mask a card number for display (show only last 4 digits).
 */
export function maskCardNumber(cardNumber: string): string {
  const last4 = cardNumber.slice(-4);
  return `•••• ${last4}`;
}

/**
 * Sanitize a string into a safe filename segment (letters, digits, dashes,
 * underscores). Falls back to `fallback` when nothing usable remains.
 */
export function sanitizeFilename(input: string, fallback = 'file', maxLength = 40): string {
  const cleaned = input
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
  return cleaned || fallback;
}
