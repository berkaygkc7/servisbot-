import type { Database } from './database.types';

// Raw Table Row Types directly from Database Schema
export type CompanyRow = Database['public']['Tables']['companies']['Row'];
export type UserRow = Database['public']['Tables']['users']['Row'];
export type SchoolRow = Database['public']['Tables']['schools']['Row'];
export type DriverRow = Database['public']['Tables']['drivers']['Row'];
export type VehicleRow = Database['public']['Tables']['vehicles']['Row'];
export type StudentRow = Database['public']['Tables']['students']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type RouteRow = Database['public']['Tables']['routes']['Row'];
export type RouteStopRow = Database['public']['Tables']['route_stops']['Row'];
export type IncomeRow = Database['public']['Tables']['incomes']['Row'];
export type ExpenseRow = Database['public']['Tables']['expenses']['Row'];
export type AccountRow = Database['public']['Tables']['accounts']['Row'];
export type PricingRuleRow = Database['public']['Tables']['pricing_rules']['Row'];
export type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
export type TagRow = Database['public']['Tables']['tags']['Row'];

// Insert Types
export type StudentInsert = Database['public']['Tables']['students']['Insert'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type RouteInsert = Database['public']['Tables']['routes']['Insert'];

// Update Types
export type StudentUpdate = Database['public']['Tables']['students']['Update'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];
export type RouteUpdate = Database['public']['Tables']['routes']['Update'];
