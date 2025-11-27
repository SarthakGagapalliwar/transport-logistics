import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, DbMaterial } from "@/lib/supabase";
import { queryKeys, cacheConfig } from "@/lib/query-keys";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface Material {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export type MaterialInput = Pick<Material, "name" | "unit" | "status"> & {
  description?: string | null;
};

// ============================================================================
// Converters
// ============================================================================

const toMaterial = (db: DbMaterial): Material => ({
  id: db.id,
  name: db.name,
  description: db.description,
  unit: db.unit,
  status: db.status,
  created_at: db.created_at,
  updated_at: db.updated_at,
});

// ============================================================================
// API Functions
// ============================================================================

export const fetchMaterials = async (): Promise<Material[]> => {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data.map(toMaterial);
};

// ============================================================================
// Query Hook
// ============================================================================

export const useMaterialsQuery = () => {
  return useQuery({
    queryKey: queryKeys.materials.all,
    queryFn: fetchMaterials,
    ...cacheConfig.standard,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

export const useAddMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MaterialInput) => {
      const { data, error } = await supabase
        .from("materials")
        .insert({
          name: input.name,
          description: input.description ?? null,
          unit: input.unit,
          status: input.status,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return toMaterial(data);
    },
    onSuccess: (newMaterial) => {
      queryClient.setQueryData<Material[]>(
        queryKeys.materials.all,
        (old = []) => [newMaterial, ...old]
      );
      toast.success(`Material "${newMaterial.name}" added`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add material: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
    },
  });
};

export const useUpdateMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & Partial<MaterialInput>) => {
      const { data, error } = await supabase
        .from("materials")
        .update({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.unit !== undefined && { unit: input.unit }),
          ...(input.status !== undefined && { status: input.status }),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return toMaterial(data);
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.materials.all });
      const previous = queryClient.getQueryData<Material[]>(
        queryKeys.materials.all
      );

      if (previous) {
        queryClient.setQueryData<Material[]>(
          queryKeys.materials.all,
          previous.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.materials.all, context.previous);
      }
      toast.error(`Failed to update material: ${error.message}`);
    },
    onSuccess: (material) => {
      toast.success(`Material "${material.name}" updated`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
    },
  });
};

export const useDeleteMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.materials.all });
      const previous = queryClient.getQueryData<Material[]>(
        queryKeys.materials.all
      );

      if (previous) {
        queryClient.setQueryData<Material[]>(
          queryKeys.materials.all,
          previous.filter((m) => m.id !== deletedId)
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.materials.all, context.previous);
      }
      toast.error(`Failed to delete material: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Material deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
    },
  });
};
