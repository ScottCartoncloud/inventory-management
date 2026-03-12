import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; className: string }> = {
  pending:     { label: "Pending",      className: "bg-[hsl(210,100%,40%)]/10 text-[hsl(210,100%,40%)] border-transparent" },
  in_progress: { label: "In Progress",  className: "bg-[hsl(215,50%,23%)]/10 text-[hsl(215,50%,23%)] border-transparent" },
  completed:   { label: "Completed",    className: "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent" },
  on_hold:     { label: "On Hold",      className: "bg-[hsl(38,92%,50%)]/12 text-[hsl(38,92%,50%)] border-transparent" },
  ok:          { label: "In Stock",     className: "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent" },
  low:         { label: "Low Stock",    className: "bg-[hsl(38,92%,50%)]/12 text-[hsl(38,92%,50%)] border-transparent" },
  out:         { label: "Out of Stock", className: "bg-destructive/10 text-destructive border-transparent" },
  ordered:     { label: "Ordered",      className: "bg-[hsl(210,100%,40%)]/10 text-[hsl(210,100%,40%)] border-transparent" },
  in_transit:  { label: "In Transit",   className: "bg-[hsl(258,90%,66%)]/10 text-[hsl(258,90%,66%)] border-transparent" },
  received:    { label: "Received",     className: "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent" },
  partial:     { label: "Partial",      className: "bg-[hsl(38,92%,50%)]/12 text-[hsl(38,92%,50%)] border-transparent" },
};

export function StatusBadge({ status }: { status: string }) {
  const { label, className } = statusMap[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", className)}>
      {label}
    </Badge>
  );
}
