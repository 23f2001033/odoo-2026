import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

export function ReportCard({
  title,
  description,
  exportHref,
  children,
}: {
  title: string;
  description?: string;
  exportHref?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {exportHref && (
          // Same-origin authenticated link — the session cookie rides along
          // automatically, no client-side fetch/blob download plumbing needed.
          <a
            href={exportHref}
            download
            className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="size-3" />
            Export CSV
          </a>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
