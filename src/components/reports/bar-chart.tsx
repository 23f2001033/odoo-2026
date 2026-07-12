// Magnitude comparison across a ranked set → bar chart, sequential (single
// hue) per the dataviz skill's form table: "Compare magnitude, low→high:
// bar/column, color job = sequential." Not SVG — plain HTML/CSS bars, same
// convention as every other hand-built component in this app (e.g. the
// week calendar in the bookings module).
export type BarDatum = { label: string; sublabel?: string; value: number };

export function BarChart({
  data,
  unit,
  emptyMessage = "No data for this period.",
}: {
  data: BarDatum[];
  unit: string;
  emptyMessage?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="viz-root space-y-3">
      <style>{`
        .viz-root { --chart-seq: #2a78d6; --chart-track: var(--muted); }
        @media (prefers-color-scheme: dark) { .viz-root { --chart-seq: #3987e5; } }
      `}</style>
      {data.map((d) => {
        // Floor so a genuinely nonzero-but-small value still renders a
        // visible, hoverable bar instead of a sliver.
        const pct = Math.max(3, (d.value / max) * 100);
        return (
          <div key={d.label} className="group">
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">
                {d.label}
                {d.sublabel && <span className="ml-1.5 font-normal text-muted-foreground">{d.sublabel}</span>}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {d.value.toLocaleString()} {unit}
              </span>
            </div>
            <div className="h-3.5 rounded-r-[4px] bg-[var(--chart-track)]">
              <div
                className="h-3.5 rounded-r-[4px] bg-[var(--chart-seq)] transition-[filter] group-hover:brightness-110"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
