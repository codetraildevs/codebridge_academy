import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@components/ui/card';
import { BarChart } from './charts';
import type { SeatTrendRow } from '@services/dashboard-service';

type TrendView = 'monthly' | 'cumulative';

export interface SeatTrendBar {
  key: string;
  color: string;
  /** Legend label in monthly (per-month deltas) view. */
  monthlyLabel: string;
  /** Legend label in cumulative (running totals) view. */
  cumulativeLabel: string;
}

/**
 * Shared "Seat Usage Trend" card — monthly deltas vs cumulative running totals
 * for one or more seat series. The platform dashboard renders two series
 * (orgs added + seats consumed, with clickable months); the organization
 * dashboard renders its own single seats-consumed series.
 */
export function SeatUsageTrend({
  trend,
  bars,
  footnoteMonthly,
  footnoteCumulative,
  onMonthSelect,
}: {
  trend: SeatTrendRow[];
  bars: SeatTrendBar[];
  footnoteMonthly: string;
  footnoteCumulative: string;
  /** When provided, each x-axis month becomes a clickable button. */
  onMonthSelect?: (month: string) => void;
}) {
  const [view, setView] = useState<TrendView>('monthly');
  if (trend.length === 0) return null;

  // Monthly deltas straight from the API; cumulative = running totals (single
  // pass accumulator so we don't re-reduce the window per month).
  const isCumulative = view === 'cumulative';
  const running: Record<string, number> = {};
  const chartData: Array<{ label: string; [key: string]: string | number }> = trend.map((m) => {
    const row: { label: string; [key: string]: string | number } = { label: m.month.slice(0, 3) };
    for (const b of bars) {
      const val = Number(m[b.key]) || 0;
      if (isCumulative) {
        const acc = (running[b.key] ?? 0) + val;
        running[b.key] = acc;
        row[b.key] = acc;
      } else {
        row[b.key] = val;
      }
    }
    return row;
  });
  const chartBars = bars.map((b) => ({
    key: b.key,
    color: b.color,
    label: isCumulative ? b.cumulativeLabel : b.monthlyLabel,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seat Usage Trend</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Seat usage view"
            className="flex items-center rounded-lg bg-surface-tertiary p-0.5"
          >
            <button
              type="button"
              aria-pressed={!isCumulative}
              onClick={() => setView('monthly')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                !isCumulative ? 'bg-white text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={isCumulative}
              onClick={() => setView('cumulative')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                isCumulative ? 'bg-white text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              Cumulative
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
            {chartBars.map((b) => (
              <span key={b.key} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} /> {b.label}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <BarChart
          data={chartData}
          bars={chartBars}
          height={180}
          onLabelClick={onMonthSelect}
        />
        <p className="mt-3 text-xs text-text-tertiary">
          {isCumulative ? footnoteCumulative : footnoteMonthly}
        </p>
      </CardBody>
    </Card>
  );
}
