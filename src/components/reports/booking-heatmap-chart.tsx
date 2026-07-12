"use client";

import { useState } from "react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Business hours only (matches the week calendar's convention in the
// bookings module) — a 24-column grid would mostly be empty, unreadable ink.
const START_HOUR = 7;
const END_HOUR = 21;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

// 5 discrete steps from the sequential blue ramp (docs: dataviz skill
// palette.md), not a continuous opacity blend — "the lightest step means
// near zero" is a picked, perceptually-tuned value, not an interpolation.
function stepIndex(count: number, max: number): number {
  if (count === 0) return -1;
  const frac = count / max;
  return Math.min(4, Math.floor(frac * 5));
}

export function BookingHeatmapChart({ grid }: { grid: number[][] }) {
  const [hover, setHover] = useState<{ day: number; hour: number; count: number } | null>(null);
  const max = Math.max(1, ...grid.flat());
  const total = grid.flat().reduce((a, b) => a + b, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No bookings in this period.</p>;
  }

  return (
    <div className="viz-root space-y-2">
      <style>{`
        .viz-root {
          --seq-0: #cde2fb; --seq-1: #9ec5f4; --seq-2: #3987e5; --seq-3: #1c5cab; --seq-4: #0d366b;
          --cell-empty: var(--muted);
        }
        @media (prefers-color-scheme: dark) {
          .viz-root { --seq-0: #184f95; --seq-1: #1c5cab; --seq-2: #2a78d6; --seq-3: #3987e5; --seq-4: #86b6ef; }
        }
      `}</style>

      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `36px repeat(${HOURS.length}, minmax(14px, 1fr))` }}
      >
        <div />
        {HOURS.map((h) => (
          <div key={h} className="text-center text-[9px] text-muted-foreground">
            {h % 3 === 0 ? h : ""}
          </div>
        ))}
        {DAY_LABELS.map((label, day) => (
          <div key={day} className="contents">
            <div className="flex items-center text-xs text-muted-foreground">{label}</div>
            {HOURS.map((hour) => {
              const count = grid[day][hour];
              const step = stepIndex(count, max);
              return (
                <button
                  type="button"
                  key={hour}
                  className="aspect-square rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ backgroundColor: step === -1 ? "var(--cell-empty)" : `var(--seq-${step})` }}
                  onMouseEnter={() => setHover({ day, hour, count })}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover({ day, hour, count })}
                  onBlur={() => setHover(null)}
                  aria-label={`${label} ${hour}:00 — ${count} booking${count === 1 ? "" : "s"}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Fixed readout instead of a cursor-following tooltip — same value,
          reachable on hover AND keyboard focus, no positioning math. */}
      <p className="text-xs text-muted-foreground">
        {hover ? (
          <>
            <strong className="text-foreground">{hover.count}</strong> booking
            {hover.count === 1 ? "" : "s"} — {DAY_LABELS[hover.day]} {hover.hour}:00–{hover.hour + 1}:00
          </>
        ) : (
          "Hover or focus a cell for details"
        )}
      </p>
    </div>
  );
}
