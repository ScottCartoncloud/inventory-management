export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_type: string | null
          address1: string
          address2: string | null
          cc_address_id: string | null
          city: string | null
          company_name: string | null
          contact_name: string | null
          country_code: string | null
          country_name: string | null
          created_at: string
          email: string | null
          google_place_id: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          lat: number | null
          lon: number | null
          org_id: string
          phone: string | null
          postcode: string | null
          source: string
          state_code: string | null
          state_name: string | null
          suburb: string | null
          updated_at: string
          use_count: number
        }
        Insert: {
          address_type?: string | null
          address1: string
          address2?: string | null
          cc_address_id?: string | null
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          email?: string | null
          google_place_id?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          lat?: number | null
          lon?: number | null
          org_id: string
          phone?: string | null
          postcode?: string | null
          source?: string
          state_code?: string | null
          state_name?: string | null
          suburb?: string | null
          updated_at?: string
          use_count?: number
        }
        Update: {
          address_type?: string | null
          address1?: string
          address2?: string | null
          cc_address_id?: string | null
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          email?: string | null
          google_place_id?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          lat?: number | null
          lon?: number | null
          org_id?: string
          phone?: string | null
          postcode?: string | null
          source?: string
          state_code?: string | null
          state_name?: string | null
          suburb?: string | null
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "addresses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          org_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          confirmation_data: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          type: string
        }
        Insert: {
          confirmation_data?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          type?: string
        }
        Update: {
          confirmation_data?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_tokens: {
        Row: {
          access_token: string
          connection_id: string
          created_at: string
          expires_at: string
          id: string
        }
        Insert: {
          access_token: string
          connection_id: string
          created_at?: string
          expires_at: string
          id?: string
        }
        Update: {
          access_token?: string
          connection_id?: string
          created_at?: string
          expires_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_tokens_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          api_endpoint: string
          cc_customer_id: string | null
          cc_warehouse_name: string | null
          client_id: string | null
          client_secret: string | null
          code: string
          color: string
          created_at: string
          extraction_hints: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          org_id: string
          product_auto_import: boolean
          product_last_sync_matched: number | null
          product_last_sync_unmatched_cc: number | null
          product_last_sync_unmatched_portal: number | null
          product_last_synced_at: string | null
          product_match_strategy: string
          product_sync_mode: string
          soh_last_refreshed_at: string | null
          soh_refresh_interval: string | null
          tenant_id: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_endpoint?: string
          cc_customer_id?: string | null
          cc_warehouse_name?: string | null
          client_id?: string | null
          client_secret?: string | null
          code: string
          color?: string
          created_at?: string
          extraction_hints?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          org_id?: string
          product_auto_import?: boolean
          product_last_sync_matched?: number | null
          product_last_sync_unmatched_cc?: number | null
          product_last_sync_unmatched_portal?: number | null
          product_last_synced_at?: string | null
          product_match_strategy?: string
          product_sync_mode?: string
          soh_last_refreshed_at?: string | null
          soh_refresh_interval?: string | null
          tenant_id?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_endpoint?: string
          cc_customer_id?: string | null
          cc_warehouse_name?: string | null
          client_id?: string | null
          client_secret?: string | null
          code?: string
          color?: string
          created_at?: string
          extraction_hints?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          org_id?: string
          product_auto_import?: boolean
          product_last_sync_matched?: number | null
          product_last_sync_unmatched_cc?: number | null
          product_last_sync_unmatched_portal?: number | null
          product_last_synced_at?: string | null
          product_match_strategy?: string
          product_sync_mode?: string
          soh_last_refreshed_at?: string | null
          soh_refresh_interval?: string | null
          tenant_id?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_mappings: {
        Row: {
          cc_product_code: string
          cc_product_id: string | null
          cc_product_name: string | null
          connection_id: string
          created_at: string
          id: string
          is_override: boolean
          last_synced_at: string | null
          org_id: string
          product_id: string
        }
        Insert: {
          cc_product_code: string
          cc_product_id?: string | null
          cc_product_name?: string | null
          connection_id: string
          created_at?: string
          id?: string
          is_override?: boolean
          last_synced_at?: string | null
          org_id?: string
          product_id: string
        }
        Update: {
          cc_product_code?: string
          cc_product_id?: string | null
          cc_product_name?: string | null
          connection_id?: string
          created_at?: string
          id?: string
          is_override?: boolean
          last_synced_at?: string | null
          org_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_uoms: {
        Row: {
          id: string
          name: string
          product_id: string
          qty: number
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          product_id: string
          qty?: number
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          product_id?: string
          qty?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_uoms_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string
          cost_price: number
          created_at: string
          dim_unit: string | null
          height: number | null
          id: string
          is_active: boolean
          length: number | null
          min_qty: number
          name: string
          notes: string | null
          org_id: string
          sell_price: number
          sku: string
          supplier: string | null
          tax_rate: number
          unit: string
          updated_at: string
          weight: number | null
          weight_unit: string | null
          width: number | null
        }
        Insert: {
          barcode?: string | null
          category?: string
          cost_price?: number
          created_at?: string
          dim_unit?: string | null
          height?: number | null
          id?: string
          is_active?: boolean
          length?: number | null
          min_qty?: number
          name: string
          notes?: string | null
          org_id?: string
          sell_price?: number
          sku: string
          supplier?: string | null
          tax_rate?: number
          unit?: string
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
          width?: number | null
        }
        Update: {
          barcode?: string | null
          category?: string
          cost_price?: number
          created_at?: string
          dim_unit?: string | null
          height?: number | null
          id?: string
          is_active?: boolean
          length?: number | null
          min_qty?: number
          name?: string
          notes?: string | null
          org_id?: string
          sell_price?: number
          sku?: string
          supplier?: string | null
          tax_rate?: number
          unit?: string
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_order_items: {
        Row: {
          cc_item_id: string
          cc_numeric_id: string | null
          cc_product_code: string | null
          cc_product_id: string | null
          created_at: string
          expiry_date: string | null
          id: string
          product_id: string | null
          product_name: string | null
          quantity: number
          raw_item: Json | null
          sale_order_id: string
          unit_of_measure: string | null
          uom_name: string | null
        }
        Insert: {
          cc_item_id: string
          cc_numeric_id?: string | null
          cc_product_code?: string | null
          cc_product_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity: number
          raw_item?: Json | null
          sale_order_id: string
          unit_of_measure?: string | null
          uom_name?: string | null
        }
        Update: {
          cc_item_id?: string
          cc_numeric_id?: string | null
          cc_product_code?: string | null
          cc_product_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          raw_item?: Json | null
          sale_order_id?: string
          unit_of_measure?: string | null
          uom_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_order_items_sale_order_id_fkey"
            columns: ["sale_order_id"]
            isOneToOne: false
            referencedRelation: "sale_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_orders: {
        Row: {
          allow_splitting: boolean | null
          cc_created_at: string | null
          cc_dispatched_at: string | null
          cc_modified_at: string | null
          cc_numeric_id: string | null
          cc_order_id: string
          cc_packed_at: string | null
          cc_version: number | null
          collect_address: string | null
          collect_company: string | null
          connection_id: string
          created_at: string
          customer_name: string | null
          deliver_address: string | null
          deliver_company: string | null
          deliver_method: string | null
          id: string
          invoice_amount: number | null
          invoice_currency: string | null
          order_number: string | null
          org_id: string
          raw_payload: Json | null
          source: string
          status: string
          total_items: number
          total_qty: number
          updated_at: string
          urgent: boolean | null
        }
        Insert: {
          allow_splitting?: boolean | null
          cc_created_at?: string | null
          cc_dispatched_at?: string | null
          cc_modified_at?: string | null
          cc_numeric_id?: string | null
          cc_order_id: string
          cc_packed_at?: string | null
          cc_version?: number | null
          collect_address?: string | null
          collect_company?: string | null
          connection_id: string
          created_at?: string
          customer_name?: string | null
          deliver_address?: string | null
          deliver_company?: string | null
          deliver_method?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_currency?: string | null
          order_number?: string | null
          org_id: string
          raw_payload?: Json | null
          source?: string
          status: string
          total_items?: number
          total_qty?: number
          updated_at?: string
          urgent?: boolean | null
        }
        Update: {
          allow_splitting?: boolean | null
          cc_created_at?: string | null
          cc_dispatched_at?: string | null
          cc_modified_at?: string | null
          cc_numeric_id?: string | null
          cc_order_id?: string
          cc_packed_at?: string | null
          cc_version?: number | null
          collect_address?: string | null
          collect_company?: string | null
          connection_id?: string
          created_at?: string
          customer_name?: string | null
          deliver_address?: string | null
          deliver_company?: string | null
          deliver_method?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_currency?: string | null
          order_number?: string | null
          org_id?: string
          raw_payload?: Json | null
          source?: string
          status?: string
          total_items?: number
          total_qty?: number
          updated_at?: string
          urgent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_orders_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_on_hand: {
        Row: {
          cc_product_code: string
          connection_id: string
          id: string
          last_updated_at: string
          org_id: string
          product_id: string
          product_status: string
          qty: number
          raw_response: Json | null
          unit_of_measure: string | null
        }
        Insert: {
          cc_product_code: string
          connection_id: string
          id?: string
          last_updated_at?: string
          org_id?: string
          product_id: string
          product_status?: string
          qty?: number
          raw_response?: Json | null
          unit_of_measure?: string | null
        }
        Update: {
          cc_product_code?: string
          connection_id?: string
          id?: string
          last_updated_at?: string
          org_id?: string
          product_id?: string
          product_status?: string
          qty?: number
          raw_response?: Json | null
          unit_of_measure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_on_hand_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_on_hand_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_on_hand_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          cc_order_id: string | null
          connection_id: string
          event_type: string
          id: string
          org_id: string
          payload: Json
          processed: boolean
          processing_error: string | null
          received_at: string
        }
        Insert: {
          cc_order_id?: string | null
          connection_id: string
          event_type: string
          id?: string
          org_id: string
          payload: Json
          processed?: boolean
          processing_error?: string | null
          received_at?: string
        }
        Update: {
          cc_order_id?: string | null
          connection_id?: string
          event_type?: string
          id?: string
          org_id?: string
          payload?: Json
          processed?: boolean
          processing_error?: string | null
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
