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
          client_id: string | null
          client_secret: string | null
          code: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          product_auto_import: boolean
          product_last_sync_matched: number | null
          product_last_sync_unmatched_cc: number | null
          product_last_sync_unmatched_portal: number | null
          product_last_synced_at: string | null
          product_match_strategy: string
          product_sync_mode: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          api_endpoint?: string
          client_id?: string | null
          client_secret?: string | null
          code: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          product_auto_import?: boolean
          product_last_sync_matched?: number | null
          product_last_sync_unmatched_cc?: number | null
          product_last_sync_unmatched_portal?: number | null
          product_last_synced_at?: string | null
          product_match_strategy?: string
          product_sync_mode?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          api_endpoint?: string
          client_id?: string | null
          client_secret?: string | null
          code?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          product_auto_import?: boolean
          product_last_sync_matched?: number | null
          product_last_sync_unmatched_cc?: number | null
          product_last_sync_unmatched_portal?: number | null
          product_last_synced_at?: string | null
          product_match_strategy?: string
          product_sync_mode?: string
          tenant_id?: string | null
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
        Relationships: []
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
