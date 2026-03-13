import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { type Connection, isConnectionConfigured } from "@/hooks/useConnections";
import { CredentialsTab } from "./tabs/CredentialsTab";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { ProductsTab } from "./tabs/ProductsTab";

interface ConnectionSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: Connection;
}

export function ConnectionSettingsModal({ open, onOpenChange, connection }: ConnectionSettingsModalProps) {
  const configured = isConnectionConfigured(connection);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center overflow-hidden font-bold text-xs shrink-0 border-2"
              style={{
                background: connection.logo_url ? 'hsl(var(--background))' : connection.color,
                borderColor: connection.color,
                color: connection.logo_url ? connection.color : 'white',
              }}
            >
              {connection.logo_url ? (
                <img src={connection.logo_url} alt={connection.name} className="w-full h-full object-contain" />
              ) : (
                connection.code.substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-bold">{connection.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground font-mono">{connection.code}</span>
                <Badge
                  variant="outline"
                  className={configured
                    ? "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] border-transparent text-[0.65rem] py-0"
                    : "bg-muted text-muted-foreground border-transparent text-[0.65rem] py-0"
                  }
                >
                  {configured ? "Connected" : "Not Configured"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="credentials" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0 px-6 justify-start">
            <TabsTrigger value="credentials" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5 text-[0.8125rem]">
              Credentials
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5 text-[0.8125rem]">
              Appearance
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5 text-[0.8125rem]">
              Products
            </TabsTrigger>
            <TabsTrigger value="sales-orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5 text-[0.8125rem]">
              Sales Orders
            </TabsTrigger>
            <TabsTrigger value="purchase-orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5 text-[0.8125rem]">
              Purchase Orders
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="credentials" className="mt-0">
              <CredentialsTab connection={connection} />
            </TabsContent>
            <TabsContent value="appearance" className="mt-0">
              <AppearanceTab connection={connection} />
            </TabsContent>
            <TabsContent value="products" className="mt-0">
              <ProductsTab connection={connection} />
            </TabsContent>
            <TabsContent value="sales-orders" className="mt-0">
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="text-4xl opacity-30">📦</div>
                <div className="font-semibold">Sales Orders</div>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Configure how sale orders are fetched from this CartonCloud tenant.
                </p>
                <Badge variant="outline" className="text-muted-foreground">Coming soon</Badge>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Sale order sync settings will be available in a future update.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="purchase-orders" className="mt-0">
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="text-4xl opacity-30">🚚</div>
                <div className="font-semibold">Purchase Orders</div>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Configure how purchase orders are fetched from this CartonCloud tenant.
                </p>
                <Badge variant="outline" className="text-muted-foreground">Coming soon</Badge>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Purchase order sync settings will be available in a future update.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
