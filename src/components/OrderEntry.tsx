import { useEffect, useState, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  orderCancelled,
  orderPlaced,
  validateOrder,
  type OrderErrors,
  type OrderType,
} from '@/features/orders/ordersSlice';
import type { Side } from '@/feed/types';
import { fmtPrice, fmtQty, fmtTime } from '@/lib/format';

export function OrderEntry({ pickedPrice }: { pickedPrice: number | null }) {
  const dispatch = useAppDispatch();
  const symbol = useAppSelector((s) => s.connection.symbol);
  const last = useAppSelector((s) => s.ticker.data?.last);
  const orders = useAppSelector((s) => s.orders.items);
  const [side, setSide] = useState<Side>('buy');
  const [type, setType] = useState<OrderType>('limit');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [errors, setErrors] = useState<OrderErrors>({});
  const [message, setMessage] = useState('');
  const base = symbol.split('/')[0];

  // A click on a book row fills in the price.
  useEffect(() => {
    if (pickedPrice != null) {
      setType('limit');
      setPrice(String(pickedPrice));
    }
  }, [pickedPrice]);

  const effectivePrice = type === 'market' ? last : Number(price);
  const total = effectivePrice && Number(qty) > 0 ? effectivePrice * Number(qty) : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    const found = validateOrder(type, price, qty);
    setErrors(found);
    if (Object.keys(found).length) return;
    dispatch(
      orderPlaced({
        symbol,
        side,
        type,
        price: type === 'limit' ? Number(price) : null,
        qty: Number(qty),
      }),
    );
    setMessage(
      `${side === 'buy' ? 'Buy' : 'Sell'} ${qty} ${base} ${type === 'market' ? 'at market' : `at ${fmtPrice(Number(price))}`} placed.`,
    );
    setQty('');
  }

  const mine = orders.filter((o) => o.symbol === symbol).slice(0, 6);

  return (
    <section className="panel entry" aria-labelledby="entry-title">
      <div className="panel-head">
        <h2 id="entry-title">Paper order</h2>
        <span className="muted">Simulated · no real funds</span>
      </div>
      <form onSubmit={submit} noValidate>
        <div className={`sides ${side}`} role="group" aria-label="Side">
          <button type="button" aria-pressed={side === 'buy'} onClick={() => setSide('buy')}>
            Buy
          </button>
          <button type="button" aria-pressed={side === 'sell'} onClick={() => setSide('sell')}>
            Sell
          </button>
        </div>
        <div className="seg seg-sm" role="group" aria-label="Order type">
          {(['limit', 'market'] as OrderType[]).map((t) => (
            <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>
              {t === 'limit' ? 'Limit' : 'Market'}
            </button>
          ))}
        </div>
        {type === 'limit' && (
          <label className="field">
            <span id="price-label">Price (USD)</span>
            <input
              aria-labelledby="price-label"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-invalid={!!errors.price}
              aria-describedby={errors.price ? 'price-error' : undefined}
            />
            {errors.price && (
              <small id="price-error" className="error">
                {errors.price}
              </small>
            )}
          </label>
        )}
        <label className="field">
          <span id="qty-label">Amount ({base})</span>
          <input
            aria-labelledby="qty-label"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-invalid={!!errors.qty}
            aria-describedby={errors.qty ? 'qty-error' : undefined}
          />
          {errors.qty && (
            <small id="qty-error" className="error">
              {errors.qty}
            </small>
          )}
        </label>
        <p className="total">
          <span>Total</span>
          <strong>
            {total != null ? `${type === 'market' ? '≈ ' : ''}${fmtPrice(total)} USD` : '—'}
          </strong>
        </p>
        <button type="submit" className={`submit ${side}`}>
          {side === 'buy' ? 'Buy' : 'Sell'} {base}
        </button>
        <p className="muted" role="status">
          {message}
        </p>
      </form>

      {mine.length > 0 && (
        <div className="orders">
          <h3>Your orders</h3>
          <ul>
            {mine.map((o) => (
              <li key={o.id}>
                <span className={o.side === 'buy' ? 'up' : 'down'}>
                  {o.side === 'buy' ? 'Buy' : 'Sell'}
                </span>
                <span>{fmtQty(o.qty)}</span>
                <span>
                  {o.status === 'filled'
                    ? `@ ${fmtPrice(o.fillPrice!)}`
                    : o.price != null
                      ? `@ ${fmtPrice(o.price)}`
                      : 'market'}
                </span>
                <span className={`badge badge-${o.status}`}>{o.status}</span>
                {o.status === 'open' ? (
                  <button
                    type="button"
                    className="link"
                    onClick={() => dispatch(orderCancelled(o.id))}
                  >
                    Cancel
                  </button>
                ) : (
                  <span className="muted">{fmtTime(o.filledAt ?? o.createdAt)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
