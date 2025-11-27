import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, DbRoute } from "@/lib/supabase";
import { queryKeys, cacheConfig } from "@/lib/query-keys";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface Route {
  id: string;
  source: string;
  destination: string;
  distanceKm: number;
  billingRatePerTon: number;
  vendorRatePerTon: number;
  estimatedTime: number;
  assignedPackageId?: string | null;
}

export type RouteInput = Omit<Route, "id">;

// ============================================================================
// Converters
// ============================================================================

const toRoute = (db: DbRoute): Route => ({
  id: db.id,
  source: db.source,
  destination: db.destination,
  distanceKm: Number(db.distance_km),
  billingRatePerTon: Number(db.billing_rate_per_ton),
  vendorRatePerTon: Number(db.vendor_rate_per_ton),
  estimatedTime: Number(db.estimated_time),
  assignedPackageId: db.assigned_package_id,
});

const toDbInsert = (input: RouteInput) => ({
  source: input.source,
  destination: input.destination,
  distance_km: input.distanceKm,
  billing_rate_per_ton: input.billingRatePerTon,
  vendor_rate_per_ton: input.vendorRatePerTon,
  estimated_time: input.estimatedTime || 0,
  assigned_package_id:
    input.assignedPackageId && input.assignedPackageId !== "none"
      ? input.assignedPackageId
      : null,
});

// ============================================================================
// API Functions
// ============================================================================

export const fetchRoutes = async (): Promise<Route[]> => {
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .order("source");

  if (error) throw new Error(error.message);
  return data.map(toRoute);
};

// ============================================================================
// Query Hook
// ============================================================================

export const useRoutesQuery = () => {
  return useQuery({
    queryKey: queryKeys.routes.all,
    queryFn: fetchRoutes,
    ...cacheConfig.standard,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

export const useAddRoute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RouteInput) => {
      const { data, error } = await supabase
        .from("routes")
        .insert(toDbInsert(input))
        .select()
        .single();

      if (error) throw new Error(error.message);
      return toRoute(data);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routes.all });
      const previous = queryClient.getQueryData<Route[]>(queryKeys.routes.all);

      const optimistic: Route = {
        id: `temp-${Date.now()}`,
        ...input,
      };

      queryClient.setQueryData<Route[]>(queryKeys.routes.all, (old = []) => [
        ...old,
        optimistic,
      ]);

      return { previous, optimisticId: optimistic.id };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.routes.all, context.previous);
      }
      toast.error(`Failed to add route: ${error.message}`);
    },
    onSuccess: (newRoute, _, context) => {
      queryClient.setQueryData<Route[]>(queryKeys.routes.all, (old = []) =>
        old.map((r) => (r.id === context?.optimisticId ? newRoute : r))
      );
      toast.success(
        `Route "${newRoute.source} → ${newRoute.destination}" added`
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
    },
  });
};

export const useUpdateRoute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (route: Route) => {
      const { error } = await supabase
        .from("routes")
        .update(toDbInsert(route))
        .eq("id", route.id);

      if (error) throw new Error(error.message);
      return route;
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routes.all });
      const previous = queryClient.getQueryData<Route[]>(queryKeys.routes.all);

      if (previous) {
        queryClient.setQueryData<Route[]>(
          queryKeys.routes.all,
          previous.map((r) => (r.id === updated.id ? updated : r))
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.routes.all, context.previous);
      }
      toast.error(`Failed to update route: ${error.message}`);
    },
    onSuccess: (route) => {
      toast.success(`Route "${route.source} → ${route.destination}" updated`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
    },
  });
};

export const useDeleteRoute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("routes").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.routes.all });
      const previous = queryClient.getQueryData<Route[]>(queryKeys.routes.all);

      if (previous) {
        queryClient.setQueryData<Route[]>(
          queryKeys.routes.all,
          previous.filter((r) => r.id !== deletedId)
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.routes.all, context.previous);
      }
      toast.error(`Failed to delete route: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Route deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.routes.all });
    },
  });
};
