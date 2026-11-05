import { memo, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { groupingChanged } from '@/features/book/bookSlice';
import { makeSelectBookView, type BookRow } from '@/features/book/selectors';
import { fmtPct, fmtPrice, fmtQty } from '@/lib/format';

const GROUPINGS: Record<string, number[]> = {
  'BTC/USD': [0, 1, 10, 50],
  'ETH/USD': [0, 0.1, 1, 5],
  'SOL/USD': [0, 0.01, 0.1, 0.5],
};

/**
 * One price level. Memoised: with 24 rows and ~60 updates a second, only rows whose
 * numbers changed re-render.
 */
const Row = memo(function Row({
  row,
  side,
  maxTotal,
  onPick,
}: {
  row: BookRow;
  side: 'bid' | 'ask';
  maxTotal: number;
  onPick: (price: number) => void;
}) {
  const depth = maxTotal ? (row.total / maxTotal) * 100 : 0;
  return (
    <tr className={`row ${side}`} style={{ '--depth': `${depth}%` } as React.CSSProperties}>
      <td>
        <button
          type="button"
          className="price"
          onClick={() => onPick(row.price)}
          aria-label={`Use price ${fmtPrice(row.price)}`}
        >
          {fmtPrice(row.price)}
        </button>
      </td>
      <td>{fmtQty(row.qty)}</td>
      <td>{fmtQty(row.total)}</td>
    </tr>
  );
});

export function OrderBook({ onPick }: { onPick: (price: number) => void }) {
  const dispatch = useAppDispatch();
  const selectView = useMemo(() => makeSelectBookView(12), []);
  const view = useAppSelector(selectView);
  const symbol = useAppSelector((s) => s.connection.symbol);
  const grouping = useAppSelector((s) => s.book.grouping);
  const ready = useAppSelector((s) => s.book.ready);

  return (
    <section className="panel book" aria-labelledby="book-title">
      <div className="panel-head">
        <h2 id="book-title">Order book</h2>
        <label className="field-inline">
          <span>Group</span>
          <select
            value={grouping}
            onChange={(e) => dispatch(groupingChanged(Number(e.target.value)))}
          >
            {(GROUPINGS[symbol] ?? [0]).map((g) => (
              <option key={g} value={g}>
                {g === 0 ? 'None' : g}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!ready ? (
        <p className="empty">Waiting for the book…</p>
      ) : (
        <table className="book-table">
          <caption className="sr-only">
            Asks (sell orders) above the spread, bids (buy orders) below. Select a price to use it
            in the order form.
          </caption>
          <thead>
            <tr>
              <th scope="col">Price</th>
              <th scope="col">Amount</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody className="asks">
            {[...view.asks].reverse().map((row) => (
              <Row key={row.price} row={row} side="ask" maxTotal={view.maxTotal} onPick={onPick} />
            ))}
          </tbody>
          <tbody>
            <tr className="spread-row">
              <td colSpan={3}>
                Spread{' '}
                {view.spread != null
                  ? `${fmtPrice(view.spread)} (${fmtPct(view.spreadPct ?? 0).replace('+', '')})`
                  : '—'}
              </td>
            </tr>
          </tbody>
          <tbody className="bids">
            {view.bids.map((row) => (
              <Row key={row.price} row={row} side="bid" maxTotal={view.maxTotal} onPick={onPick} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
