import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, DbShipment } from "@/lib/supabase";
import { queryKeys, cacheConfig } from "@/lib/query-keys";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useTransportersQuery, Transporter } from "./use-transporters";
import { useVehiclesQuery, Vehicle } from "./use-vehicles";
import { useRoutesQuery, Route } from "./use-routes";
import { usePackagesQuery, Package } from "./use-packages";
import { useMaterialsQuery, Material } from "./use-materials";

// ============================================================================
// Types
// ============================================================================

export interface Shipment {
  id: string;
  transporterId: string;
  transporterName?: string;
  vehicleId: string;
  vehicleNumber?: string;
  source: string;
  destination: string;
  quantityTons: number;
  status: string;
  departureTime: string;
  arrivalTime: string | null;
  remarks?: string;
  routeId?: string;
  packageId?: string;
  packageName?: string;
  materialId?: string;
  materialName?: string;
  billingRatePerTon?: number | null;
  vendorRatePerTon?: number | null;
  created_at?: string;
  grossWeight: number;
  tareWeight: number;
}

export type ShipmentInput = Omit<
  Shipment,
  | "id"
  | "transporterName"
  | "vehicleNumber"
  | "packageName"
  | "materialName"
  | "created_at"
>;

// ============================================================================
// Converters
// ============================================================================

type DbShipmentWithRelations = DbShipment & {
  transporters?: { name: string } | null;
  vehicles?: { vehicle_number: string } | null;
  routes?: { billing_rate_per_ton: number; vendor_rate_per_ton: number } | null;
  packages?: { name: string } | null;
  materials?: { name: string } | null;
};

const toShipment = (db: DbShipmentWithRelations): Shipment => ({
  id: db.id,
  transporterId: db.transporter_id,
  transporterName: db.transporters?.name ?? "Unknown",
  vehicleId: db.vehicle_id,
  vehicleNumber: db.vehicles?.vehicle_number ?? "Unknown",
  source: db.source,
  destination: db.destination,
  quantityTons: Number(db.quantity_tons),
  status: db.status,
  departureTime: db.departure_time,
  arrivalTime: db.arrival_time,
  remarks: db.remarks ?? undefined,
  routeId: db.route_id ?? undefined,
  packageId: db.package_id ?? undefined,
  packageName: db.packages?.name ?? "None",
  materialId: db.material_id ?? undefined,
  materialName: db.materials?.name ?? "None",
  billingRatePerTon: db.routes?.billing_rate_per_ton ?? null,
  vendorRatePerTon: db.routes?.vendor_rate_per_ton ?? null,
  created_at: db.created_at,
  grossWeight: Number(db.gross_weight) || 0,
  tareWeight: Number(db.tare_weight) || 0,
});

const toDbInsert = (input: ShipmentInput) => ({
  transporter_id: input.transporterId,
  vehicle_id: input.vehicleId,
  source: input.source,
  destination: input.destination,
  quantity_tons: input.quantityTons,
  status: input.status || "Pending",
  departure_time: input.departureTime,
  arrival_time: input.arrivalTime,
  remarks: input.remarks,
  route_id: input.routeId || null,
  package_id:
    input.packageId && input.packageId !== "none" ? input.packageId : null,
  material_id:
    input.materialId && input.materialId !== "none" ? input.materialId : null,
  gross_weight: input.grossWeight,
  tare_weight: input.tareWeight,
});

// ============================================================================
// API Functions
// ============================================================================

const SHIPMENT_SELECT = `
  *,
  transporters:transporter_id (name),
  vehicles:vehicle_id (vehicle_number),
  routes:route_id (billing_rate_per_ton, vendor_rate_per_ton),
  packages:package_id (name),
  materials:material_id (name)
`;

export const fetchShipments = async (
  isAdmin: boolean,
  userPackages: string[] = []
): Promise<Shipment[]> => {
  let query = supabase
    .from("shipments")
    .select(SHIPMENT_SELECT)
    .order("created_at", { ascending: false });

  if (!isAdmin && userPackages.length > 0) {
    query = query.in("package_id", userPackages);
  } else if (!isAdmin) {
    return [];
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data.map(toShipment);
};

// ============================================================================
// Query Hooks
// ============================================================================

export const useUserProfileQuery = (
  userId: string | undefined,
  enabled: boolean
) => {
  return useQuery({
    queryKey: queryKeys.users.profile(userId ?? ""),
    queryFn: async () => {
      if (!userId) return { assigned_packages: [] };
      const { data, error } = await supabase
        .from("profiles")
        .select("assigned_packages")
        .eq("id", userId)
        .single();
      if (error) return { assigned_packages: [] };
      return data;
    },
    enabled: enabled && !!userId,
    ...cacheConfig.standard,
  });
};

export const useShipmentsQuery = (
  isAdmin: boolean,
  userPackages: string[],
  enabled: boolean
) => {
  return useQuery({
    queryKey: queryKeys.shipments.list(isAdmin, userPackages),
    queryFn: () => fetchShipments(isAdmin, userPackages),
    enabled,
    ...cacheConfig.short,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

export const useAddShipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ShipmentInput) => {
      if (!input.transporterId) throw new Error("Transporter is required");
      if (!input.vehicleId) throw new Error("Vehicle is required");

      const { data, error } = await supabase
        .from("shipments")
        .insert(toDbInsert(input))
        .select(SHIPMENT_SELECT)
        .single();

      if (error) throw new Error(error.message);
      return toShipment(data);
    },
    onSuccess: (shipment) => {
      toast.success(
        `Shipment from ${shipment.source} to ${shipment.destination} added`
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to add shipment: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
};

export const useUpdateShipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & ShipmentInput) => {
      if (!input.transporterId) throw new Error("Transporter is required");
      if (!input.vehicleId) throw new Error("Vehicle is required");

      const { error } = await supabase
        .from("shipments")
        .update(toDbInsert(input))
        .eq("id", id);

      if (error) throw new Error(error.message);
      return { id, ...input };
    },
    onSuccess: (shipment) => {
      toast.success(
        `Shipment from ${shipment.source} to ${shipment.destination} updated`
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to update shipment: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
};

export const useDeleteShipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipments").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      toast.success("Shipment deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete shipment: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
};
