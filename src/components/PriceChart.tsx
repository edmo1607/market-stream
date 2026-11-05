import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/app/hooks';
import { CANDLE_SECONDS } from '@/features/candles/candlesSlice';

/**
 * TradingView Lightweight Charts, driven imperatively: the chart is created once, and
 * each store change pushes only the newest candle (series.update) instead of re-drawing.
 */
export function PriceChart() {
  const candles = useAppSelector((s) => s.candles.items);
  const symbol = useAppSelector((s) => s.candles.symbol);
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const drawn = useRef(0);

  useEffect(() => {
    if (!host.current) return;
    const c = createChart(host.current, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#9aa4b2', fontFamily: 'inherit' },
      grid: { vertLines: { color: '#1c222b' }, horzLines: { color: '#1c222b' } },
      timeScale: { timeVisible: true, secondsVisible: true, borderColor: '#262d38' },
      rightPriceScale: { borderColor: '#262d38' },
      crosshair: { mode: 1 },
    });
    series.current = c.addCandlestickSeries({
      upColor: '#3fb68b',
      downColor: '#ff5b5b',
      borderVisible: false,
      wickUpColor: '#3fb68b',
      wickDownColor: '#ff5b5b',
    });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
      series.current = null;
    };
  }, []);

  // New market: start from scratch.
  useEffect(() => {
    series.current?.setData([]);
    drawn.current = 0;
  }, [symbol]);

  useEffect(() => {
    const s = series.current;
    if (!s || !candles.length) return;
    // The chart library renders UTC; shift so the axis shows the viewer's local time.
    const offset = new Date().getTimezoneOffset() * 60;
    const toBar = (c: (typeof candles)[number]) => ({
      ...c,
      time: (c.time - offset) as UTCTimestamp,
    });
    if (drawn.current === 0 || candles.length < drawn.current) {
      s.setData(candles.map(toBar));
    } else {
      for (const c of candles.slice(Math.max(0, drawn.current - 1))) s.update(toBar(c));
    }
    drawn.current = candles.length;
  }, [candles]);

  return (
    <section className="panel chart" aria-labelledby="chart-title">
      <div className="panel-head">
        <h2 id="chart-title">Price</h2>
        <span className="muted">{CANDLE_SECONDS}s candles from live trades</span>
      </div>
      <div
        ref={host}
        className="chart-host"
        role="img"
        aria-label={`${symbol} candlestick chart`}
      />
      {candles.length === 0 && (
        <p className="empty chart-empty">Candles appear as trades come in…</p>
      )}
    </section>
  );
}
