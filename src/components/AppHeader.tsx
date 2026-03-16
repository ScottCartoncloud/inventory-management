import { Home, Package, ClipboardCheck, PackageOpen, Briefcase, Settings, ChevronDown, LogOut, Boxes, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "inventory", label: "Stock on Hand", icon: Package },
  { id: "orders", label: "Orders", icon: ClipboardCheck },
  { id: "purchase-orders", label: "Purchase Orders", icon: PackageOpen },
  { id: "products", label: "Products", icon: Briefcase },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "settings", label: "Settings", icon: Settings },
];

interface AppHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppHeader({ activeTab, onTabChange }: AppHeaderProps) {
  return (
    <header className="bg-[hsl(206,95%,36%)] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[hsl(210,100%,40%)] rounded-md flex items-center justify-center">
            <Boxes size={18} />
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">Bibendum</div>
            <div className="text-[0.625rem] opacity-60">Inventory Management</div>
          </div>
          <ChevronDown size={14} className="opacity-60" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">sarah.jones@bibendum.com.au</span>
          <span className="text-xs px-2 py-0.5 bg-white/10 rounded">Customer Admin</span>
          <button className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors">
            <LogOut size={14} />
            Log Out
          </button>
        </div>
      </div>
      {/* Navigation */}
      <nav className="flex items-center justify-center gap-1 px-4 py-1.5">
        {navItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <span key={item.id} className="contents">
              {i > 0 && <span className="text-white/30 text-base">|</span>}
              <button
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-white",
                  activeTab === item.id ? "bg-white/15 font-semibold" : "hover:bg-white/10"
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon size={15} />
                {item.label}
              </button>
            </span>
          );
        })}
      </nav>
    </header>
  );
}
