import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConnections, isConnectionConfigured, type Connection } from "./useConnections";
import { PURCHASE_ORDERS, type PurchaseOrder, type PurchaseOrderItem } from "@/data/orders";

interface CartonCloudInboundOrder {
  id: string;
  status: string;
  references?: { customer?: string; numericId?: string };
  customer?: { name?: string; id?: string };
  details?: {
    urgent?: boolean;
    instructions?: string;
    arrivalDate?: string;
    parentId?: string | null;
    hasChildren?: boolean;
  };
  properties?: Record<string, any>;
  items?: Array<{
    details?: {
      product?: { name?: string; code?: string };
      unitOfMeasure?: { type?: string };
    };
    measures?: { quantity?: number };
    properties?: { expiryDate?: string; batch?: string };
    status?: string;
  }>;
  timestamps?: {
    created?: { time?: string };
  };
  version?: number;
}

function transformInboundOrder(
  raw: CartonCloudInboundOrder,
  connection: Connection
): PurchaseOrder {
  const rawItems = raw.items || [];
  const totalQty = rawItems.reduce((sum, item) => sum + (item.measures?.quantity || 0), 0);

  const items: PurchaseOrderItem[] = rawItems.map(item => ({
    product: item.details?.product?.name || "",
    sku: item.details?.product?.code || "",
    qty: item.measures?.quantity || 0,
    expiryDate: item.properties?.expiryDate || "",
    batch: item.properties?.batch || "",
    status: item.status || "",
  }));

  return {
    id: raw.id,
    ref: raw.references?.customer || "",
    numericId: raw.references?.numericId || "",
    customer: raw.customer?.name || "",
    product: rawItems[0]?.details?.product?.name || "",
    sku: rawItems[0]?.details?.product?.code || "",
    itemCount: rawItems.length,
    qty: totalQty,
    location: connection.code.toLowerCase(),
    connectionId: connection.id,
    status: raw.status,
    cartoncloudStatus: raw.status,
    arrivalDate: raw.details?.arrivalDate || "",
    urgent: raw.details?.urgent || false,
    instructions: raw.details?.instructions || "",
    items,
    properties: raw.properties || {},
  };
}

interface PurchaseOrdersResult {
  purchaseOrders: PurchaseOrder[];
  isLoading: boolean;
  errors: Array<{ connectionCode: string; message: string }>;
  isUsingMockData: boolean;
}

export function usePurchaseOrders(): PurchaseOrdersResult {
  const { data: connections, isLoading: connectionsLoading } = useConnections();

  const configuredConnections = (connections || []).filter(
    (c) => c.is_active && isConnectionConfigured(c)
  );

  const hasConfigured = configuredConnections.length > 0;

  const { data, isLoading: ordersLoading } = useQuery({
    queryKey: ["purchase-orders", configuredConnections.map((c) => c.id)],
    queryFn: async () => {
      const results = await Promise.allSettled(
        configuredConnections.map(async (conn) => {
          const { data, error } = await supabase.functions.invoke(
            "cartoncloud-proxy",
            {
              body: {
                connectionId: conn.id,
                method: "POST",
                path: "inbound-orders/search",
                body: {
                  condition: {
                    type: "AndCondition",
                    conditions: [],
                  },
                },
              },
            }
          );
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          const orders = Array.isArray(data) ? data : [];
          return {
            connection: conn,
            orders: orders.map((o: CartonCloudInboundOrder) =>
              transformInboundOrder(o, conn)
            ),
          };
        })
      );

      const allOrders: PurchaseOrder[] = [];
      const errors: Array<{ connectionCode: string; message: string }> = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          allOrders.push(...result.value.orders);
        } else {
          const connIndex = results.indexOf(result);
          errors.push({
            connectionCode: configuredConnections[connIndex]?.code || "Unknown",
            message: result.reason?.message || "Failed to fetch purchase orders",
          });
        }
      }

      return { purchaseOrders: allOrders, errors };
    },
    enabled: hasConfigured,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (!hasConfigured && !connectionsLoading) {
    return {
      purchaseOrders: PURCHASE_ORDERS,
      isLoading: false,
      errors: [],
      isUsingMockData: true,
    };
  }

  return {
    purchaseOrders: data?.purchaseOrders || [],
    isLoading: connectionsLoading || ordersLoading,
    errors: data?.errors || [],
    isUsingMockData: false,
  };
}
