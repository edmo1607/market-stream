import { symbolChanged } from '@/app/actions';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { sourceChanged, type Source } from '@/features/connection/connectionSlice';
import { SYMBOLS } from '@/feed/types';

const STATUS_LABEL = {
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
  closed: 'Disconnected',
} as const;

export function Header() {
  const dispatch = useAppDispatch();
  const { symbol, source, status, detail } = useAppSelector((s) => s.connection);
  const label = source === 'simulated' && status === 'open' ? 'Simulated' : STATUS_LABEL[status];

  return (
    <header className="header">
      <div className="brand">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M3 17l5-6 4 4 8-10" />
          <path d="M14 5h6v6" />
        </svg>
        <span>Market Stream</span>
      </div>

      <label className="field-inline">
        <span className="sr-only">Market</span>
        <select value={symbol} onChange={(e) => dispatch(symbolChanged(e.target.value))}>
          {SYMBOLS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>

      <div className="seg" role="group" aria-label="Data source">
        {(['live', 'simulated'] as Source[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={source === s}
            onClick={() => dispatch(sourceChanged({ source: s }))}
          >
            {s === 'live' ? 'Live' : 'Simulated'}
          </button>
        ))}
      </div>

      <span className={`status status-${status}`} role="status" title={detail}>
        <span className="dot" aria-hidden="true" />
        {label}
        {detail && <span className="status-detail"> · {detail}</span>}
      </span>
    </header>
  );
}
