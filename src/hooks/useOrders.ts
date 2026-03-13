import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConnections, isConnectionConfigured, type Connection } from "./useConnections";
import { ORDERS, type Order } from "@/data/orders";

// CartonCloud status → our status mapping
const STATUS_MAP: Record<string, string> = {
  DRAFT: "pending",
  AWAITING_PICK_PACK: "pending",
  PACKING_IN_PROGRESS: "in_progress",
  PACKED: "in_progress",
  DISPATCHED: "completed",
  REJECTED: "on_hold",
};

function mapStatus(ccStatus: string): string {
  return STATUS_MAP[ccStatus] || "pending";
}

interface CartonCloudAddress {
  street1?: string;
  street2?: string;
  city?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface CartonCloudOrder {
  id: string;
  status: string;
  references?: { customer?: string; numericId?: string };
  customer?: { name?: string; id?: string };
  details?: {
    deliveryDate?: string;
    instructions?: string;
    deliver?: {
      address?: CartonCloudAddress;
      requiredDate?: string;
    };
    collect?: {
      requiredDate?: string;
    };
  };
  items?: Array<{
    details?: {
      product?: { name?: string; code?: string };
      unitOfMeasure?: { type?: string };
    };
    measures?: { quantity?: number };
  }>;
  timestamps?: {
    created?: { time?: string };
  };
  properties?: Record<string, string>;
  version?: number;
}

function formatAddress(addr?: CartonCloudAddress): string {
  if (!addr) return "";
  const parts = [
    addr.street1,
    addr.street2,
    addr.suburb || addr.city,
    addr.state,
    addr.postcode,
  ].filter(Boolean);
  return parts.join(", ");
}

function transformOrder(
  ccOrder: CartonCloudOrder,
  connection: Connection
): Order {
  const items = ccOrder.items || [];
  const totalQty = items.reduce((sum, item) => sum + (item.measures?.quantity || 0), 0);

  const numericId = ccOrder.references?.numericId || "";

  return {
    id: numericId ? `ORD-${numericId}` : ccOrder.id.substring(0, 8),
    numericId,
    ref: ccOrder.references?.customer || "",
    customer: ccOrder.customer?.name || "Unknown",
    qty: totalQty,
    location: connection.code.toLowerCase(),
    status: mapStatus(ccOrder.status),
    created: ccOrder.timestamps?.created?.time
      ? new Date(ccOrder.timestamps.created.time).toLocaleDateString()
      : "",
    eta: ccOrder.details?.deliver?.requiredDate
      || ccOrder.details?.collect?.requiredDate
      || ccOrder.details?.deliveryDate
      || "",
    consignment: "",
    deliveryAddress: formatAddress(ccOrder.details?.deliver?.address),
  };
}

interface OrdersResult {
  orders: Order[];
  isLoading: boolean;
  errors: Array<{ connectionCode: string; message: string }>;
  isUsingMockData: boolean;
}

export function useOrders(): OrdersResult {
  const { data: connections, isLoading: connectionsLoading } = useConnections();

  const configuredConnections = (connections || []).filter(
    (c) => c.is_active && isConnectionConfigured(c)
  );

  const hasConfigured = configuredConnections.length > 0;

  const {
    data,
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ["orders", configuredConnections.map((c) => c.id)],
    queryFn: async () => {
      const results = await Promise.allSettled(
        configuredConnections.map(async (conn) => {
          const { data, error } = await supabase.functions.invoke(
            "cartoncloud-proxy",
            {
              body: {
                connectionId: conn.id,
                method: "POST",
                path: "outbound-orders/search",
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
            orders: orders.map((o: CartonCloudOrder) => transformOrder(o, conn)),
          };
        })
      );

      const allOrders: Order[] = [];
      const errors: Array<{ connectionCode: string; message: string }> = [];

      for (const result of results) {
        if (result.status === "fulfilled") {
          allOrders.push(...result.value.orders);
        } else {
          const connIndex = results.indexOf(result);
          errors.push({
            connectionCode: configuredConnections[connIndex]?.code || "Unknown",
            message: result.reason?.message || "Failed to fetch orders",
          });
        }
      }

      return { orders: allOrders, errors };
    },
    enabled: hasConfigured,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (!hasConfigured && !connectionsLoading) {
    return {
      orders: ORDERS,
      isLoading: false,
      errors: [],
      isUsingMockData: true,
    };
  }

  return {
    orders: data?.orders || [],
    isLoading: connectionsLoading || ordersLoading,
    errors: data?.errors || [],
    isUsingMockData: false,
  };
}
