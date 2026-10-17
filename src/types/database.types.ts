export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          company_name: string
          subscription_status: string | null
          subscription_tier: string | null
          public_registration_token: string | null
          company_phone: string | null
          company_address: string | null
          whatsapp_template: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_name: string
          subscription_status?: string | null
          subscription_tier?: string | null
          public_registration_token?: string | null
          company_phone?: string | null
          company_address?: string | null
          whatsapp_template?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          subscription_status?: string | null
          subscription_tier?: string | null
          public_registration_token?: string | null
          company_phone?: string | null
          company_address?: string | null
          whatsapp_template?: string | null
          created_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          company_id: string
          full_name: string
          role: string | null
          created_at: string
        }
        Insert: {
          id: string
          company_id: string
          full_name: string
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          full_name?: string
          role?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      schools: {
        Row: {
          id: string
          company_id: string
          name: string
          address: string | null
          latitude: number | null
          longitude: number | null
          has_shifts: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          address?: string | null
          latitude?: number | null
          longitude?: number | null
          has_shifts?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          address?: string | null
          latitude?: number | null
          longitude?: number | null
          has_shifts?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      drivers: {
        Row: {
          id: string
          company_id: string
          full_name: string
          phone: string
          license_number: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          phone: string
          license_number?: string | null
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          full_name?: string
          phone?: string
          license_number?: string | null
          status?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      vehicles: {
        Row: {
          id: string
          company_id: string
          plate_number: string
          driver_id: string | null
          driver_name: string | null
          capacity: number | null
          status: string | null
          color: string | null
          current_latitude: number | null
          current_longitude: number | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          plate_number: string
          driver_id?: string | null
          driver_name?: string | null
          capacity?: number | null
          status?: string | null
          color?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          plate_number?: string
          driver_id?: string | null
          driver_name?: string | null
          capacity?: number | null
          status?: string | null
          color?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          is_active?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      students: {
        Row: {
          id: string
          company_id: string
          full_name: string
          parent_name: string | null
          parent_phone: string
          parent_tc: string | null
          address: string | null
          neighborhood: string | null
          home_latitude: number | null
          home_longitude: number | null
          school_id: string | null
          school_level: string | null
          grade: string | null
          shift: string | null
          status: string | null
          is_archived: boolean | null
          vehicle_id: string | null
          tags: string[] | null
          registration_date: string | null
          registration_number: number | null
          custom_price: number | null
          total_debt: number | null
          parent_signature: string | null
          contract_signed_at: string | null
          login_token: string | null
          blood_group: string | null
          allergies: string | null
          payment_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          full_name: string
          parent_name?: string | null
          parent_phone: string
          parent_tc?: string | null
          address?: string | null
          neighborhood?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          school_id?: string | null
          school_level?: string | null
          grade?: string | null
          shift?: string | null
          status?: string | null
          is_archived?: boolean | null
          vehicle_id?: string | null
          tags?: string[] | null
          registration_date?: string | null
          registration_number?: number | null
          custom_price?: number | null
          total_debt?: number | null
          parent_signature?: string | null
          contract_signed_at?: string | null
          login_token?: string | null
          blood_group?: string | null
          allergies?: string | null
          payment_note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          full_name?: string
          parent_name?: string | null
          parent_phone?: string
          parent_tc?: string | null
          address?: string | null
          neighborhood?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          school_id?: string | null
          school_level?: string | null
          grade?: string | null
          shift?: string | null
          status?: string | null
          is_archived?: boolean | null
          vehicle_id?: string | null
          tags?: string[] | null
          registration_date?: string | null
          registration_number?: number | null
          custom_price?: number | null
          total_debt?: number | null
          parent_signature?: string | null
          contract_signed_at?: string | null
          login_token?: string | null
          blood_group?: string | null
          allergies?: string | null
          payment_note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          company_id: string
          student_id: string
          amount: number
          payment_date: string | null
          month: string | null
          payment_method: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          student_id: string
          amount: number
          payment_date?: string | null
          month?: string | null
          payment_method?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          student_id?: string
          amount?: number
          payment_date?: string | null
          month?: string | null
          payment_method?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          }
        ]
      }
      routes: {
        Row: {
          id: string
          company_id: string
          name: string
          vehicle_id: string | null
          driver_id: string | null
          shift: string | null
          type: string | null
          tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          vehicle_id?: string | null
          driver_id?: string | null
          shift?: string | null
          type?: string | null
          tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          vehicle_id?: string | null
          driver_id?: string | null
          shift?: string | null
          type?: string | null
          tags?: string[] | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          }
        ]
      }
      route_stops: {
        Row: {
          id: string
          company_id: string | null
          route_id: string
          name: string
          stop_order: number
          latitude: number
          longitude: number
          estimated_time: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          route_id: string
          name: string
          stop_order: number
          latitude: number
          longitude: number
          estimated_time?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          route_id?: string
          name?: string
          stop_order?: number
          latitude?: number
          longitude?: number
          estimated_time?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          }
        ]
      }
      incomes: {
        Row: {
          id: string
          company_id: string
          account_id: string | null
          income_category: string
          title: string
          income_date: string
          amount: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          account_id?: string | null
          income_category: string
          title: string
          income_date: string
          amount: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          account_id?: string | null
          income_category?: string
          title?: string
          income_date?: string
          amount?: number
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          company_id: string
          account_id: string | null
          vehicle_id: string | null
          category: string
          title: string
          expense_date: string
          amount: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          account_id?: string | null
          vehicle_id?: string | null
          category: string
          title: string
          expense_date: string
          amount: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          account_id?: string | null
          vehicle_id?: string | null
          category?: string
          title?: string
          expense_date?: string
          amount?: number
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          id: string
          company_id: string
          name: string
          type: string | null
          phone: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          type?: string | null
          phone?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          type?: string | null
          phone?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          id: string
          company_id: string
          school_id: string | null
          school_level: string
          amount: number
          annual_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          school_id?: string | null
          school_level: string
          amount: number
          annual_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          school_id?: string | null
          school_level?: string
          amount?: number
          annual_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          company_id: string
          user_id: string | null
          action_type: string
          table_name: string
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id?: string | null
          action_type: string
          table_name: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string | null
          action_type?: string
          table_name?: string
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          company_id: string
          name: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          color?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_driver_location: {
        Args: {
          p_vehicle_id: string
          p_lat: number
          p_lng: number
          p_speed?: number
          p_heading?: number
        }
        Returns: Json
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
