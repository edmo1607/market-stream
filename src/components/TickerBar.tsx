import { useAppSelector } from '@/app/hooks';
import { fmtCompact, fmtPct, fmtPrice } from '@/lib/format';

export function TickerBar() {
  const { data, direction } = useAppSelector((s) => s.ticker);
  const symbol = useAppSelector((s) => s.connection.symbol);
  const base = symbol.split('/')[0];

  return (
    <section className="ticker" aria-label={`${symbol} summary`}>
      <div className="ticker-main">
        <h1>{symbol}</h1>
        <span className={`last ${direction}`} aria-live="off">
          {data ? fmtPrice(data.last) : '—'}
          <span className="sr-only">
            {direction === 'up' ? ' (up)' : direction === 'down' ? ' (down)' : ''}
          </span>
        </span>
      </div>
      <dl className="ticker-stats">
        <div>
          <dt>24h change</dt>
          <dd className={data ? (data.change >= 0 ? 'up' : 'down') : ''}>
            {data ? `${fmtPrice(data.change)} (${fmtPct(data.changePct)})` : '—'}
          </dd>
        </div>
        <div>
          <dt>24h high</dt>
          <dd>{data ? fmtPrice(data.high) : '—'}</dd>
        </div>
        <div>
          <dt>24h low</dt>
          <dd>{data ? fmtPrice(data.low) : '—'}</dd>
        </div>
        <div>
          <dt>24h volume</dt>
          <dd>{data ? `${fmtCompact(data.volume)} ${base}` : '—'}</dd>
        </div>
      </dl>
    </section>
  );
}
