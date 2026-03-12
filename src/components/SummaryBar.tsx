interface SummaryItem {
  label: string;
  value: string | number;
  className?: string;
}

export function SummaryBar({ items }: { items: SummaryItem[] }) {
  return (
    <div className="bg-muted px-5 py-2 border-b border-border flex gap-8 flex-wrap">
      {items.map((s, i) => (
        <div key={i} className="flex gap-1.5 items-baseline">
          <span className="text-xs text-muted-foreground">{s.label}:</span>
          <span className={`text-[0.8125rem] font-semibold ${s.className ?? ""}`}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}
