import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ChatView } from "@/components/views/ChatView";
import { DashboardView } from "@/components/views/DashboardView";
import { InventoryView } from "@/components/views/InventoryView";
import { OrdersView } from "@/components/views/OrdersView";
import { PurchaseOrdersView } from "@/components/views/PurchaseOrdersView";
import { ProductsView } from "@/components/views/ProductsView";
import { AddressesView } from "@/components/views/AddressesView";
import { SettingsView } from "@/components/views/SettingsView";

const Index = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [activeLocation, setActiveLocation] = useState("all");

  function handleNavigate(tab: string, location?: string) {
    setActiveTab(tab);
    if (location) setActiveLocation(location);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "chat" && <ChatView />}
        {activeTab === "dashboard" && <DashboardView onNavigate={handleNavigate} />}
        {activeTab === "inventory" && <InventoryView activeLocation={activeLocation} onLocationChange={setActiveLocation} />}
        {activeTab === "orders" && <OrdersView activeLocation={activeLocation} onLocationChange={setActiveLocation} />}
        {activeTab === "purchase-orders" && <PurchaseOrdersView activeLocation={activeLocation} onLocationChange={setActiveLocation} />}
        {activeTab === "products" && <ProductsView />}
        {activeTab === "addresses" && <AddressesView />}
        {activeTab === "settings" && <SettingsView />}
      </main>
    </div>
  );
};

export default Index;
