export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          created_at: string
          created_by_id: string
          id: string
          name: string
          shipment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_id: string
          id?: string
          name: string
          shipment_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_id?: string
          id?: string
          name?: string
          shipment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          assigned_packages: string[] | null
          created_at: string
          full_name: string | null
          id: string
          phone_number: string | null
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          active?: boolean
          assigned_packages?: string[] | null
          created_at?: string
          full_name?: string | null
          id: string
          phone_number?: string | null
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          active?: boolean
          assigned_packages?: string[] | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          assigned_package_id: string | null
          billing_rate_per_ton: number
          created_at: string
          destination: string
          distance_km: number
          estimated_time: number
          id: string
          source: string
          updated_at: string
          vendor_rate_per_ton: number
        }
        Insert: {
          assigned_package_id?: string | null
          billing_rate_per_ton: number
          created_at?: string
          destination: string
          distance_km: number
          estimated_time?: number
          id?: string
          source: string
          updated_at?: string
          vendor_rate_per_ton: number
        }
        Update: {
          assigned_package_id?: string | null
          billing_rate_per_ton?: number
          created_at?: string
          destination?: string
          distance_km?: number
          estimated_time?: number
          id?: string
          source?: string
          updated_at?: string
          vendor_rate_per_ton?: number
        }
        Relationships: [
          {
            foreignKeyName: "routes_assigned_package_id_fkey"
            columns: ["assigned_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          arrival_time: string | null
          created_at: string
          departure_time: string
          destination: string
          id: string
          material_id: string | null
          package_id: string | null
          quantity_tons: number
          remarks: string | null
          route_id: string | null
          source: string
          status: string
          transporter_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string
          departure_time: string
          destination: string
          id?: string
          material_id?: string | null
          package_id?: string | null
          quantity_tons: number
          remarks?: string | null
          route_id?: string | null
          source: string
          status?: string
          transporter_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          arrival_time?: string | null
          created_at?: string
          departure_time?: string
          destination?: string
          id?: string
          material_id?: string | null
          package_id?: string | null
          quantity_tons?: number
          remarks?: string | null
          route_id?: string | null
          source?: string
          status?: string
          transporter_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transporters: {
        Row: {
          address: string
          contact_number: string
          contact_person: string
          created_at: string
          gstn: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address: string
          contact_number: string
          contact_person: string
          created_at?: string
          gstn: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_number?: string
          contact_person?: string
          created_at?: string
          gstn?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          shipment_updates: boolean
          sms_notifications: boolean
          system_announcements: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          shipment_updates?: boolean
          sms_notifications?: boolean
          system_announcements?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          shipment_updates?: boolean
          sms_notifications?: boolean
          system_announcements?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity: number
          created_at: string
          id: string
          last_maintenance: string | null
          status: string
          transporter_id: string
          updated_at: string
          vehicle_number: string
          vehicle_type: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id?: string
          last_maintenance?: string | null
          status?: string
          transporter_id: string
          updated_at?: string
          vehicle_number: string
          vehicle_type: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          last_maintenance?: string | null
          status?: string
          transporter_id?: string
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_roles_view: {
        Row: {
          id: string | null
          role: string | null
        }
        Insert: {
          id?: string | null
          role?: string | null
        }
        Update: {
          id?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_packages_to_user: {
        Args: { user_id: string; package_ids: string[] }
        Returns: undefined
      }
      assign_user_role: {
        Args: { user_id: string; user_role: string }
        Returns: undefined
      }
      delete_user: {
        Args: { user_id: string }
        Returns: undefined
      }
      toggle_user_access: {
        Args: { user_id: string; is_active: boolean }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
