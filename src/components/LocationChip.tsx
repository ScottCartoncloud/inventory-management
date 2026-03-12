import { LOCATIONS } from "@/data/locations";

export function LocationChip({ locationId }: { locationId: string }) {
  const loc = LOCATIONS.find(l => l.id === locationId);
  if (!loc) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-muted">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: loc.color }} />
      {loc.code}
    </span>
  );
}
