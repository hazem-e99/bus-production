// Locale-aware date and currency formatting helpers
// Currency can be overridden via NEXT_PUBLIC_CURRENCY (e.g., EGP, USD)

function getLocale(lang: string): string {
  return lang === 'ar' ? 'ar-EG' : 'en-US';
}

export function formatCurrency(lang: string, amount?: number | null, currency?: string): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '—';
  const cur = currency || (process.env.NEXT_PUBLIC_CURRENCY || (lang === 'ar' ? 'EGP' : 'USD'));
  try {
    return new Intl.NumberFormat(getLocale(lang), {
      style: 'currency',
      currency: String(cur),
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    // Fallback to plain number with 2 decimals
    return `${Number(amount).toFixed(2)} ${cur}`.trim();
  }
}

export function formatDate(
  lang: string,
  dateInput?: Date | string | number | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '—';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '—';
  const fmt: Intl.DateTimeFormatOptions = options || { year: 'numeric', month: 'long', day: 'numeric' };
  try {
    return new Intl.DateTimeFormat(getLocale(lang), fmt).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}
