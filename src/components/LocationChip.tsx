import { useConnections } from "@/hooks/useConnections";
import { LOCATIONS } from "@/data/locations";

export function LocationChip({ locationId }: { locationId: string }) {
  const { data: connections } = useConnections();

  // Try DB connections first, fall back to hardcoded
  const dbConn = connections?.find((c) => c.code.toLowerCase() === locationId.toLowerCase());
  const hardcoded = LOCATIONS.find((l) => l.id === locationId);

  const color = dbConn?.color ?? hardcoded?.color;
  const code = dbConn?.code ?? hardcoded?.code;

  if (!color || !code) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-muted">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {code}
    </span>
  );
}
