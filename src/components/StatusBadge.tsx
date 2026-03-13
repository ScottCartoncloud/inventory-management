import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatCCStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const statusMap: Record<string, { label: string; className: string }> = {
  // CartonCloud raw statuses
  DRAFT:                { label: "Draft",               className: "bg-muted text-muted-foreground border-transparent" },
  AWAITING_PICK_PACK:   { label: "Awaiting Pick Pack",  className: "bg-[hsl(210,100%,40%)]/10 text-[hsl(210,100%,40%)] border-transparent" },
  PACKING_IN_PROGRESS:  { label: "Packing In Progress", className: "bg-[hsl(258,90%,66%)]/10 text-[hsl(258,90%,66%)] border-transparent" },
  PACKED:               { label: "Packed",              className: "bg-[hsl(215,50%,23%)]/10 text-[hsl(215,50%,23%)] border-transparent" },
  DISPATCHED:           { label: "Dispatched",          className: "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent" },
  REJECTED:             { label: "Rejected",            className: "bg-destructive/10 text-destructive border-transparent" },
  CANCELLED:            { label: "Cancelled",           className: "bg-destructive/10 text-destructive border-transparent" },
  ON_HOLD:              { label: "On Hold",             className: "bg-[hsl(38,92%,50%)]/12 text-[hsl(38,92%,50%)] border-transparent" },

  // Inbound order statuses
  AWAITING_ARRIVAL:     { label: "Awaiting Arrival",   className: "bg-[hsl(210,100%,40%)]/10 text-[hsl(210,100%,40%)] border-transparent" },
  ARRIVED:              { label: "Arrived",             className: "bg-[hsl(210,100%,40%)]/10 text-[hsl(210,100%,40%)] border-transparent" },
  RECEIVING_IN_PROGRESS:{ label: "Receiving",           className: "bg-[hsl(38,92%,50%)]/12 text-[hsl(38,92%,50%)] border-transparent" },
  RECEIVED:             { label: "Received",            className: "bg-[hsl(38,92%,50%)]/12 text-[hsl(38,92%,50%)] border-transparent" },
  VERIFIED:             { label: "Verified",            className: "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent" },
  ALLOCATED:            { label: "Allocated",           className: "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent" },

  // Internal / legacy statuses
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
  const entry = statusMap[status];
  const label = entry?.label ?? formatCCStatus(status);
  const className = entry?.className ?? "bg-muted text-muted-foreground border-transparent";
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", className)}>
      {label}
    </Badge>
  );
}
