export function BarChart({
  data,
  bars,
  height = 160,
  onLabelClick,
  highlightLabel,
}: {
  data: Array<{ label: string; [key: string]: string | number }>;
  bars: Array<{ key: string; color: string; label: string }>;
  height?: number;
  /** When provided, each x-axis label becomes a clickable button. */
  onLabelClick?: (label: string) => void;
  /** When set, only the column with this label stays at full opacity. */
  highlightLabel?: string | null;
}) {
  const maxVal = Math.max(
    ...data.map((d) => bars.reduce((sum, b) => sum + (Number(d[b.key]) || 0), 0)),
    1,
  );
  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-0 flex flex-col justify-between">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <div key={ratio} className="border-t border-border/50" />
        ))}
      </div>
      <div className="relative flex h-full items-end justify-around gap-2">
        {data.map((d) => {
          // null and undefined both mean "no selection" → no dimming
          const isDimmed = highlightLabel != null && highlightLabel !== d.label;
          return (
            <div
              key={d.label}
              className={`flex flex-col items-center gap-1 transition-opacity duration-300 ${isDimmed ? 'opacity-30' : ''}`}
            >
              <div className="flex items-end gap-0.5" style={{ height: height - 24 }}>
                {bars.map((b) => {
                  const val = Number(d[b.key]) || 0;
                  const pct = (val / maxVal) * (height - 24);
                  return (
                    <div
                      key={b.key}
                      className="w-2.5 rounded-t-sm transition-all duration-500 hover:opacity-80"
                      style={{ height: `${Math.max(pct, 2)}px`, backgroundColor: b.color }}
                      title={`${b.label}: ${val}`}
                    />
                  );
                })}
              </div>
              {onLabelClick ? (
                <button
                  type="button"
                  onClick={() => onLabelClick(d.label)}
                  className={`text-[10px] transition-colors hover:text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm px-1 ${
                    highlightLabel === d.label ? 'font-semibold text-primary-600' : 'text-text-tertiary'
                  }`}
                  aria-label={`Show ${d.label} monthly registrations breakdown`}
                >
                  {d.label}
                </button>
              ) : (
                <span className={`text-[10px] ${highlightLabel === d.label ? 'font-semibold text-primary-600' : 'text-text-tertiary'}`}>
                  {d.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  size = 160,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size * 0.35;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={size * 0.08} />
        {data.map((d) => {
          const pct = d.value / total;
          const dashLength = pct * circumference;
          const seg = (
            <circle
              key={d.label}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={d.color} strokeWidth={size * 0.08}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset} strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-500"
            />
          );
          offset += dashLength;
          return seg;
        })}
        {total === 0 && (
          <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="fill-text-tertiary text-xs">
            No data
          </text>
        )}
      </svg>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-text-secondary">{d.label}</span>
            <span className="text-xs font-medium text-text-primary ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
