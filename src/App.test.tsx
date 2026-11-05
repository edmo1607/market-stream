import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { App } from './App';
import { makeStore } from './app/store';
import type { FeedFactory, FeedHandlers } from './feed/types';

// Canvas charts don't run in jsdom.
vi.mock('lightweight-charts', () => ({
  createChart: () => ({
    addCandlestickSeries: () => ({ setData: () => {}, update: () => {} }),
    remove: () => {},
  }),
}));

/** A feed the test drives by hand. */
function testFeed() {
  let handlers: FeedHandlers | null = null;
  const factory: FeedFactory = (h) => {
    handlers = h;
    h.onStatus('open');
    return { subscribe: () => {}, close: () => {} };
  };
  return {
    factory,
    emit: (...args: Parameters<FeedHandlers['onEvents']>) => handlers!.onEvents(...args),
  };
}

beforeAll(() => {
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0) as unknown as number;
});

it('renders the stream and turns a boƒok click into an order', async () => {
  const user = userEvent.setup();
  const live = testFeed();
  render(
    <Provider store={makeStore()}>
      <App feeds={{ live: live.factory, simulated: live.factory }} />
    </Provider>,
  );
  expect(screen.getByText('Waiting for the book…')).toBeInTheDocument();

  live.emit([
    { type: 'book', kind: 'snapshot', symbol: 'BTC/USD', bids: [[68000, 1.5]], asks: [[68001, 2]] },
    {
      type: 'trades',
      symbol: 'BTC/USD',
      trades: [{ id: '1', side: 'buy', price: 68001, qty: 0.25, time: Date.now() }],
    },
    {
      type: 'ticker',
      symbol: 'BTC/USD',
      last: 68001,
      bid: 68000,
      ask: 68001,
      high: 68100,
      low: 67900,
      volume: 1234,
      change: 50,
      changePct: 0.07,
    },
  ]);

  const book = await screen.findByRole('table', { name: /asks/i });
  expect(within(book).getByText('Spread 1.00 (0.00%) · Mid 68,000.50')).toBeInTheDocument();
  expect(document.querySelector('.status')).toHaveTextContent('Live');

  await user.click(screen.getByRole('button', { name: 'Use price 68,000.00' }));
  expect(screen.getByLabelText('Price (USD)')).toHaveValue('68000');
  await user.type(screen.getByLabelText('Amount (BTC)'), '0.1');
  expect(screen.getByText('6,800.00 USD')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Buy BTC' }));
  expect(screen.getByText(/Buy 0.1 BTC at 68,000.00 placed/)).toBeInTheDocument();
  expect(screen.getByText('open')).toBeInTheDocument();
});

it('shows validation errors instead of placing a bad order', async () => {
  const user = userEvent.setup();
  const live = testFeed();
  render(
    <Provider store={makeStore()}>
      <App feeds={{ live: live.factory, simulated: live.factory }} />
    </Provider>,
  );
  await user.click(screen.getByRole('button', { name: 'Buy BTC' }));
  expect(screen.getByText('Enter a price above 0.')).toBeInTheDocument();
  expect(screen.getByText('Enter an amount above 0.')).toBeInTheDocument();
  expect(screen.getByLabelText('Amount (BTC)')).toHaveAttribute('aria-invalid', 'true');
});
