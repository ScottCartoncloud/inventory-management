import { useConnections, isConnectionConfigured } from "@/hooks/useConnections";
import { cn } from "@/lib/utils";

interface LocationPillsProps {
  activeLocation: string;
  onLocationChange: (loc: string) => void;
}

export function LocationPills({ activeLocation, onLocationChange }: LocationPillsProps) {
  const { data: connections } = useConnections();

  const locations = (connections || [])
    .filter(c => c.is_active && isConnectionConfigured(c))
    .map(c => ({ id: c.id, name: c.name, color: c.color }));

  return (
    <div className="flex gap-1.5 flex-wrap">
      <button
        className={cn(
          "px-3 py-1 rounded-full text-[0.8125rem] font-medium border-[1.5px] transition-all",
          activeLocation === "all"
            ? "bg-[hsl(210,100%,40%)] border-[hsl(210,100%,40%)] text-white"
            : "bg-card border-border text-muted-foreground hover:border-[hsl(210,100%,40%)] hover:text-[hsl(210,100%,40%)]"
        )}
        onClick={() => onLocationChange("all")}
      >
        All Locations
      </button>
      {locations.map(loc => (
        <button
          key={loc.id}
          className={cn(
            "px-3 py-1 rounded-full text-[0.8125rem] font-medium border-[1.5px] transition-all",
            activeLocation === loc.id
              ? "bg-[hsl(210,100%,40%)] border-[hsl(210,100%,40%)] text-white"
              : "bg-card border-border text-muted-foreground hover:border-[hsl(210,100%,40%)] hover:text-[hsl(210,100%,40%)]"
          )}
          onClick={() => onLocationChange(loc.id)}
        >
          <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: loc.color }} />
          {loc.name}
        </button>
      ))}
    </div>
  );
}
