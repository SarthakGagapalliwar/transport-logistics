/**
 * Supabase client and type utilities.
 * Re-exports the auto-generated client and provides type helpers.
 */
export { supabase } from "@/integrations/supabase/client";
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";

// Convenient table row type aliases (from auto-generated types)
export type DbMaterial = Tables<"materials">;
export type DbPackage = Tables<"packages">;
export type DbProfile = Tables<"profiles">;
export type DbRoute = Tables<"routes">;
export type DbShipment = Tables<"shipments">;
export type DbTransporter = Tables<"transporters">;
export type DbVehicle = Tables<"vehicles">;
export type DbUserSettings = Tables<"user_settings">;

// Insert types
export type DbMaterialInsert = TablesInsert<"materials">;
export type DbPackageInsert = TablesInsert<"packages">;
export type DbRouteInsert = TablesInsert<"routes">;
export type DbShipmentInsert = TablesInsert<"shipments">;
export type DbTransporterInsert = TablesInsert<"transporters">;
export type DbVehicleInsert = TablesInsert<"vehicles">;

// Update types
export type DbMaterialUpdate = TablesUpdate<"materials">;
export type DbPackageUpdate = TablesUpdate<"packages">;
export type DbRouteUpdate = TablesUpdate<"routes">;
export type DbShipmentUpdate = TablesUpdate<"shipments">;
export type DbTransporterUpdate = TablesUpdate<"transporters">;
export type DbVehicleUpdate = TablesUpdate<"vehicles">;
