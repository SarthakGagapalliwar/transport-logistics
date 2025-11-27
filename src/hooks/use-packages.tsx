import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, DbPackage } from "@/lib/supabase";
import { queryKeys, cacheConfig } from "@/lib/query-keys";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// ============================================================================
// Types
// ============================================================================

export interface Package {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export type PackageInput = Pick<Package, "name" | "active">;

// ============================================================================
// Converters
// ============================================================================

const toPackage = (db: DbPackage): Package => ({
  id: db.id,
  name: db.name,
  createdById: db.created_by_id,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
  active: db.active,
});

// ============================================================================
// API Functions
// ============================================================================

export const fetchPackages = async (): Promise<Package[]> => {
  const { data, error } = await supabase.from("packages").select("*");
  if (error) throw new Error(error.message);
  return data.map(toPackage);
};

// ============================================================================
// Query Hooks
// ============================================================================

export const usePackagesQuery = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.packages.all,
    queryFn: fetchPackages,
    ...cacheConfig.standard,
    ...options,
  });
};

export const useAllUsersQuery = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, role");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    ...cacheConfig.standard,
    ...options,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

export const useAddPackage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: PackageInput) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("packages")
        .insert({
          name: input.name,
          active: input.active,
          created_by_id: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return toPackage(data);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.packages.all });
      const previous = queryClient.getQueryData<Package[]>(
        queryKeys.packages.all
      );

      const optimistic: Package = {
        id: `temp-${Date.now()}`,
        name: input.name,
        createdById: user?.id ?? "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: input.active,
      };

      queryClient.setQueryData<Package[]>(
        queryKeys.packages.all,
        (old = []) => [...old, optimistic]
      );

      return { previous, optimisticId: optimistic.id };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.packages.all, context.previous);
      }
      toast.error(`Failed to add package: ${error.message}`);
    },
    onSuccess: (newPkg, _, context) => {
      // Replace optimistic with real data
      queryClient.setQueryData<Package[]>(queryKeys.packages.all, (old = []) =>
        old.map((p) => (p.id === context?.optimisticId ? newPkg : p))
      );
      toast.success(`Package "${newPkg.name}" added`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
    },
  });
};

export const useUpdatePackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & Partial<PackageInput>) => {
      const { data, error } = await supabase
        .from("packages")
        .update({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.active !== undefined && { active: input.active }),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return toPackage(data);
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.packages.all });
      const previous = queryClient.getQueryData<Package[]>(
        queryKeys.packages.all
      );

      if (previous) {
        queryClient.setQueryData<Package[]>(
          queryKeys.packages.all,
          previous.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.packages.all, context.previous);
      }
      toast.error(`Failed to update package: ${error.message}`);
    },
    onSuccess: (pkg) => {
      toast.success(`Package "${pkg.name}" updated`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
    },
  });
};

export const useDeletePackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.packages.all });
      const previous = queryClient.getQueryData<Package[]>(
        queryKeys.packages.all
      );

      if (previous) {
        queryClient.setQueryData<Package[]>(
          queryKeys.packages.all,
          previous.filter((p) => p.id !== deletedId)
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.packages.all, context.previous);
      }
      toast.error(`Failed to delete package: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Package deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
    },
  });
};
