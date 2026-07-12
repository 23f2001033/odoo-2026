import { cn } from "@/lib/utils";

export type CalendarBooking = {
  id: string;
  startsAt: string; // ISO
  endsAt: string;
  displayStatus: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  bookedBy: { name: string };
  purpose: string | null;
};

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 21;
const SLOT_MINUTES = 30;
const TOTAL_SLOTS = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES; // 28
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function slotIndex(d: Date): number {
  const minutes = (d.getHours() - GRID_START_HOUR) * 60 + d.getMinutes();
  return Math.max(0, Math.min(TOTAL_SLOTS, Math.round(minutes / SLOT_MINUTES)));
}

function dayIndex(d: Date): number {
  return (d.getDay() + 6) % 7; // Monday=0 .. Sunday=6
}

// Server-renderable — pure grid layout from data, no interactivity needed to
// just *see* a resource's schedule (spec Screen 6: "Calendar view of a
// resource's existing bookings").
export function WeekCalendar({ weekStart, bookings }: { weekStart: string; bookings: CalendarBooking[] }) {
  const start = new Date(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  const blocks = bookings
    .filter((b) => b.displayStatus !== "CANCELLED")
    .flatMap((b) => {
      const s = new Date(b.startsAt);
      const e = new Date(b.endsAt);
      const startOfWeek = days[0];
      const endOfWeek = new Date(days[6]);
      endOfWeek.setDate(endOfWeek.getDate() + 1);
      if (e <= startOfWeek || s >= endOfWeek) return [];
      const col = dayIndex(s) + 2; // +1 for time-label col, +1 for 1-indexed grid lines
      const rowStart = slotIndex(s) + 2; // +1 for header row, +1 for 1-indexed grid lines
      const rowEnd = Math.max(rowStart + 1, slotIndex(e) + 2);
      return [{ ...b, col, rowStart, rowEnd, s, e }];
    });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div
        className="grid min-w-[720px]"
        style={{
          gridTemplateColumns: "56px repeat(7, 1fr)",
          gridTemplateRows: `auto repeat(${TOTAL_SLOTS}, 22px)`,
        }}
      >
        <div className="sticky left-0 z-10 border-b border-r bg-background" />
        {days.map((d, i) => (
          <div
            key={i}
            className="border-b border-l p-1.5 text-center text-xs font-medium"
            style={{ gridColumn: i + 2, gridRow: 1 }}
          >
            {DAY_LABELS[i]}
            <span className="ml-1 text-muted-foreground">{d.getDate()}</span>
          </div>
        ))}

        {Array.from({ length: TOTAL_SLOTS }, (_, i) => i)
          .filter((i) => i % 2 === 0)
          .map((i) => (
            <div
              key={i}
              className="border-r bg-background pr-1.5 text-right text-[10px] text-muted-foreground"
              style={{ gridColumn: 1, gridRow: `${i + 2} / ${i + 4}` }}
            >
              {String(GRID_START_HOUR + i / 2).padStart(2, "0")}:00
            </div>
          ))}

        {Array.from({ length: TOTAL_SLOTS }, (_, i) => i).map((i) =>
          days.map((_, col) => (
            <div
              key={`${i}-${col}`}
              className={cn("border-l", i % 2 === 0 ? "border-t" : "border-t border-dashed border-t-border/50")}
              style={{ gridColumn: col + 2, gridRow: i + 2 }}
            />
          ))
        )}

        {blocks.map((b) => (
          <div
            key={b.id}
            className={cn(
              "m-0.5 overflow-hidden rounded px-1.5 py-0.5 text-[11px] leading-tight",
              b.displayStatus === "ONGOING"
                ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                : "bg-primary/15 text-primary"
            )}
            style={{ gridColumn: b.col, gridRow: `${b.rowStart} / ${b.rowEnd}` }}
            title={`${b.bookedBy.name}${b.purpose ? ` — ${b.purpose}` : ""}`}
          >
            <span className="font-medium">{b.bookedBy.name}</span>
            {b.purpose && <span className="block truncate opacity-80">{b.purpose}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
