import { useAppSelector } from '@/app/hooks';
import { fmtPrice, fmtQty, fmtTime } from '@/lib/format';

export function TradesTape() {
  const trades = useAppSelector((s) => s.trades.items);
  return (
    <section className="panel trades" aria-labelledby="trades-title">
      <div className="panel-head">
        <h2 id="trades-title">Trades</h2>
      </div>
      {trades.length === 0 ? (
        <p className="empty">Waiting for trades…</p>
      ) : (
        <table className="trades-table">
          <thead>
            <tr>
              <th scope="col">Price</th>
              <th scope="col">Amount</th>
              <th scope="col">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.slice(0, 24).map((t) => (
              <tr key={t.id} className={t.side === 'buy' ? 'bid' : 'ask'}>
                <td>
                  {fmtPrice(t.price)}
                  <span className="sr-only"> {t.side}</span>
                </td>
                <td>{fmtQty(t.qty)}</td>
                <td>{fmtTime(t.time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
