const price = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const qty = new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const time = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export const fmtPrice = (n: number) => price.format(n);
export const fmtQty = (n: number) => qty.format(n);
export const fmtCompact = (n: number) => compact.format(n);
export const fmtTime = (ms: number) => time.format(ms);
export const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
