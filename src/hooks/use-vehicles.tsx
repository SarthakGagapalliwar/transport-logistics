import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, DbVehicle } from "@/lib/supabase";
import { queryKeys, cacheConfig } from "@/lib/query-keys";
import { toast } from "sonner";
import { useTransportersQuery, Transporter } from "./use-transporters";

// ============================================================================
// Types
// ============================================================================

export interface Vehicle {
  id: string;
  transporterId: string;
  transporterName?: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  status: string;
  lastMaintenance: string | null;
  active: boolean;
}

export type VehicleInput = Omit<Vehicle, "id" | "transporterName">;

// ============================================================================
// Converters
// ============================================================================

const toVehicle = (
  db: DbVehicle & { transporters?: { name: string } | null }
): Vehicle => ({
  id: db.id,
  transporterId: db.transporter_id,
  transporterName: db.transporters?.name ?? "Unknown",
  vehicleNumber: db.vehicle_number,
  vehicleType: db.vehicle_type,
  capacity: Number(db.capacity),
  status: db.status,
  lastMaintenance: db.last_maintenance,
  active: db.active,
});

const toDbInsert = (input: VehicleInput) => ({
  transporter_id: input.transporterId,
  vehicle_number: input.vehicleNumber,
  vehicle_type: input.vehicleType,
  capacity: input.capacity,
  status: input.status,
  last_maintenance: input.lastMaintenance,
  active: input.active,
});

// ============================================================================
// API Functions
// ============================================================================

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, transporters:transporter_id (name)")
    .order("vehicle_number");

  if (error) throw new Error(error.message);
  return data.map(toVehicle);
};

// ============================================================================
// Query Hook
// ============================================================================

export const useVehiclesQuery = () => {
  return useQuery({
    queryKey: queryKeys.vehicles.all,
    queryFn: fetchVehicles,
    ...cacheConfig.standard,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

export const useAddVehicle = () => {
  const queryClient = useQueryClient();
  const { data: transporters = [] } = useTransportersQuery();

  return useMutation({
    mutationFn: async (input: VehicleInput) => {
      const { data, error } = await supabase
        .from("vehicles")
        .insert(toDbInsert(input))
        .select("*, transporters:transporter_id (name)")
        .single();

      if (error) {
        if (
          error.code === "23505" &&
          error.message.includes("vehicle_number")
        ) {
          throw new Error("Vehicle number already exists");
        }
        throw new Error(error.message);
      }

      return toVehicle(data);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vehicles.all });
      const previous = queryClient.getQueryData<Vehicle[]>(
        queryKeys.vehicles.all
      );

      const optimistic: Vehicle = {
        id: `temp-${Date.now()}`,
        ...input,
        transporterName:
          transporters.find((t) => t.id === input.transporterId)?.name ??
          "Unknown",
      };

      queryClient.setQueryData<Vehicle[]>(
        queryKeys.vehicles.all,
        (old = []) => [...old, optimistic]
      );

      return { previous, optimisticId: optimistic.id };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.vehicles.all, context.previous);
      }
      toast.error(`Failed to add vehicle: ${error.message}`);
    },
    onSuccess: (newVehicle, _, context) => {
      queryClient.setQueryData<Vehicle[]>(queryKeys.vehicles.all, (old = []) =>
        old.map((v) => (v.id === context?.optimisticId ? newVehicle : v))
      );
      toast.success(`Vehicle "${newVehicle.vehicleNumber}" added`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();
  const { data: transporters = [] } = useTransportersQuery();

  return useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      const { data, error } = await supabase
        .from("vehicles")
        .update(toDbInsert(vehicle))
        .eq("id", vehicle.id)
        .select("*, transporters:transporter_id (name)")
        .single();

      if (error) {
        if (
          error.code === "23505" &&
          error.message.includes("vehicle_number")
        ) {
          throw new Error("Vehicle number already exists");
        }
        throw new Error(error.message);
      }

      return toVehicle(data);
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vehicles.all });
      const previous = queryClient.getQueryData<Vehicle[]>(
        queryKeys.vehicles.all
      );

      const enhanced = {
        ...updated,
        transporterName:
          transporters.find((t) => t.id === updated.transporterId)?.name ??
          "Unknown",
      };

      if (previous) {
        queryClient.setQueryData<Vehicle[]>(
          queryKeys.vehicles.all,
          previous.map((v) => (v.id === updated.id ? enhanced : v))
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.vehicles.all, context.previous);
      }
      toast.error(`Failed to update vehicle: ${error.message}`);
    },
    onSuccess: (vehicle) => {
      queryClient.setQueryData<Vehicle[]>(queryKeys.vehicles.all, (old = []) =>
        old.map((v) => (v.id === vehicle.id ? vehicle : v))
      );
      toast.success(`Vehicle "${vehicle.vehicleNumber}" updated`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vehicles.all });
      const previous = queryClient.getQueryData<Vehicle[]>(
        queryKeys.vehicles.all
      );

      if (previous) {
        queryClient.setQueryData<Vehicle[]>(
          queryKeys.vehicles.all,
          previous.filter((v) => v.id !== deletedId)
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.vehicles.all, context.previous);
      }
      toast.error(`Failed to delete vehicle: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Vehicle deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
  });
};

export const useToggleVehicleActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("vehicles")
        .update({ active })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id, active };
    },
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vehicles.all });
      const previous = queryClient.getQueryData<Vehicle[]>(
        queryKeys.vehicles.all
      );

      if (previous) {
        queryClient.setQueryData<Vehicle[]>(
          queryKeys.vehicles.all,
          previous.map((v) => (v.id === id ? { ...v, active } : v))
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.vehicles.all, context.previous);
      }
      toast.error(`Failed to update status: ${error.message}`);
    },
    onSuccess: ({ active }) => {
      toast.success(`Vehicle ${active ? "activated" : "deactivated"}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
  });
};

// ============================================================================
// Utility Functions
// ============================================================================

export const useIsVehicleNumberDuplicate = () => {
  const { data: vehicles = [] } = useVehiclesQuery();

  return (vehicleNumber: string, excludeId?: string): boolean =>
    vehicles.some(
      (v) =>
        v.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase() &&
        v.id !== excludeId
    );
};
