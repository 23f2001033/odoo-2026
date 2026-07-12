import { cn } from "@/lib/utils";

// Styled native <select> — used for form dropdowns where a plain, reliable
// control beats a custom popover (keyboard/mobile friendly out of the box).
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-input h-8 w-full rounded-lg border bg-background px-2.5 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        className
      )}
      {...props}
    />
  );
}
