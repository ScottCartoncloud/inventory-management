import { useConnections } from "@/hooks/useConnections";

export function LocationChip({ locationId }: { locationId: string }) {
  const { data: connections } = useConnections();

  const conn = connections?.find((c) => c.id === locationId);

  if (!conn) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-muted">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: conn.color }} />
      {conn.name}
    </span>
  );
}
