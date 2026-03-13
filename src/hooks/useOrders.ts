import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useConnections, isConnectionConfigured, type Connection } from "./useConnections";
import { ORDERS, type Order } from "@/data/orders";

interface CartonCloudAddress {
  address1?: string;
  address2?: string;
  companyName?: string;
  contactName?: string;
  city?: string;
  suburb?: string;
  state?: { name?: string; code?: string } | string;
  postcode?: string;
  country?: { name?: string } | string;
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
      name?: string;
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

function safeString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return "";
  return String(val);
}

function getStateCode(state?: CartonCloudAddress["state"]): string {
  if (!state) return "";
  if (typeof state === "string") return state;
  return state.code || state.name || "";
}

function formatAddress(details?: CartonCloudOrder["details"]): string {
  if (!details?.deliver?.address) return "";
  const addr = details.deliver.address;

  const parts = [
    safeString(addr.address1),
    safeString(addr.address2),
    safeString(addr.suburb) || safeString(addr.city),
    getStateCode(addr.state),
    safeString(addr.postcode),
  ].filter(Boolean);

  return parts.join(", ");
}

function getCustomerName(details?: CartonCloudOrder["details"]): string {
  const addr = details?.deliver?.address;
  return addr?.companyName || addr?.contactName || "";
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
    customer: getCustomerName(ccOrder.details),
    qty: totalQty,
    location: connection.id,
    status: ccOrder.status,
    created: ccOrder.timestamps?.created?.time
      ? new Date(ccOrder.timestamps.created.time).toLocaleDateString()
      : "",
    consignment: "",
    deliveryAddress: formatAddress(ccOrder.details),
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
