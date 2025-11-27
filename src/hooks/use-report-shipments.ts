import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AuthUser } from "@/context/AuthContext";
import { queryKeys, cacheConfig } from "@/lib/query-keys";

type ShipmentRow = {
  id: string;
  source: string;
  destination: string;
  quantity_tons: string | number | null;
  departure_time: string;
  gross_weight: string | number | null;
  tare_weight: string | number | null;
  transporters?: { name?: string | null } | null;
  vehicles?: { vehicle_number?: string | null } | null;
  packages?: { name?: string | null } | null;
  routes?: {
    billing_rate_per_ton?: number | null;
    vendor_rate_per_ton?: number | null;
  } | null;
  materials?: {
    name?: string | null;
    unit?: string | null;
    description?: string | null;
  } | null;
};

export interface ReportShipment {
  id: string;
  source: string;
  destination: string;
  quantity_tons: number;
  departure_time: string;
  gross_weight: number;
  tare_weight: number;
  transporters: { name: string | null } | null;
  vehicles: { vehicle_number: string | null } | null;
  packages: { name: string | null } | null;
  routes: {
    billing_rate_per_ton: number | null;
    vendor_rate_per_ton: number | null;
  } | null;
  materials: {
    name: string | null;
    unit: string | null;
    description: string | null;
  } | null;
  billing_amount: number | null;
  vendor_amount: number | null;
  profit: number | null;
}

type QueryParams = {
  userId: string | null;
  role: AuthUser["role"] | null;
};

const selectClause = `
    id,
    source,
    destination,
    quantity_tons,
    departure_time,
    gross_weight,
    tare_weight,
    transporters:transporter_id (name),
    vehicles:vehicle_id (vehicle_number),
    packages:package_id (name),
    routes:route_id (billing_rate_per_ton, vendor_rate_per_ton),
    materials:material_id (name, unit, description)
`;

const normalizeShipment = (shipment: ShipmentRow): ReportShipment => {
  const grossWeight = Number(shipment.gross_weight) || 0;
  const tareWeight = Number(shipment.tare_weight) || 0;
  const netWeight = Number(shipment.quantity_tons) || 0;
  const billingRate = shipment.routes?.billing_rate_per_ton ?? null;
  const vendorRate = shipment.routes?.vendor_rate_per_ton ?? null;

  const billingAmount =
    typeof billingRate === "number" ? billingRate * netWeight : null;
  const vendorAmount =
    typeof vendorRate === "number" ? vendorRate * netWeight : null;
  const profit =
    billingAmount !== null && vendorAmount !== null
      ? billingAmount - vendorAmount
      : null;

  return {
    id: shipment.id,
    source: shipment.source,
    destination: shipment.destination,
    quantity_tons: netWeight,
    departure_time: shipment.departure_time,
    gross_weight: grossWeight,
    tare_weight: tareWeight,
    transporters: shipment.transporters
      ? { name: shipment.transporters.name ?? null }
      : null,
    vehicles: shipment.vehicles
      ? { vehicle_number: shipment.vehicles.vehicle_number ?? null }
      : null,
    packages: shipment.packages
      ? { name: shipment.packages.name ?? null }
      : null,
    routes: shipment.routes
      ? {
          billing_rate_per_ton: shipment.routes.billing_rate_per_ton ?? null,
          vendor_rate_per_ton: shipment.routes.vendor_rate_per_ton ?? null,
        }
      : null,
    materials: shipment.materials
      ? {
          name: shipment.materials.name ?? null,
          unit: shipment.materials.unit ?? null,
          description: shipment.materials.description ?? null,
        }
      : null,
    billing_amount: billingAmount,
    vendor_amount: vendorAmount,
    profit,
  };
};

const resolvePackageFilter = async (
  userId: string
): Promise<string[] | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("assigned_packages")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data?.assigned_packages ?? null;
};

const fetchReportShipments = async ({
  userId,
  role,
}: QueryParams): Promise<ReportShipment[]> => {
  if (!userId) {
    return [];
  }

  const isAdmin = role === "admin";
  let assignedPackages: string[] | null = null;

  if (!isAdmin) {
    assignedPackages = await resolvePackageFilter(userId);
    if (!assignedPackages || assignedPackages.length === 0) {
      return [];
    }
  }

  let query = supabase
    .from("shipments")
    .select(selectClause)
    .order("departure_time", { ascending: false });

  if (assignedPackages) {
    query = query.in("package_id", assignedPackages);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as ShipmentRow[] | null)?.map(normalizeShipment) ?? [];
};

export const useReportShipments = (user: AuthUser | null) => {
  const params: QueryParams = {
    userId: user?.id ?? null,
    role: user?.role ?? null,
  };

  return useQuery({
    queryKey: queryKeys.shipments.reports(params.userId, params.role),
    queryFn: () => fetchReportShipments(params),
    enabled: Boolean(params.userId),
    ...cacheConfig.session,
  });
};
