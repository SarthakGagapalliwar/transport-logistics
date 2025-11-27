import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, DbTransporter } from "@/lib/supabase";
import { queryKeys, cacheConfig } from "@/lib/query-keys";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface Transporter {
  id: string;
  name: string;
  gstn: string;
  contactPerson: string;
  contactNumber: string;
  address: string;
  active: boolean;
}

export type TransporterInput = Omit<Transporter, "id">;

// ============================================================================
// Converters
// ============================================================================

const toTransporter = (db: DbTransporter): Transporter => ({
  id: db.id,
  name: db.name,
  gstn: db.gstn,
  contactPerson: db.contact_person,
  contactNumber: db.contact_number,
  address: db.address,
  active: db.active,
});

const toDbInsert = (input: TransporterInput) => ({
  name: input.name,
  gstn: input.gstn,
  contact_person: input.contactPerson,
  contact_number: input.contactNumber,
  address: input.address,
  active: input.active,
});

// ============================================================================
// API Functions
// ============================================================================

export const fetchTransporters = async (): Promise<Transporter[]> => {
  const { data, error } = await supabase
    .from("transporters")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return data.map(toTransporter);
};

// ============================================================================
// Query Hook
// ============================================================================

export const useTransportersQuery = () => {
  return useQuery({
    queryKey: queryKeys.transporters.all,
    queryFn: fetchTransporters,
    ...cacheConfig.standard,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

export const useAddTransporter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransporterInput) => {
      const { data, error } = await supabase
        .from("transporters")
        .insert(toDbInsert(input))
        .select()
        .single();

      if (error) throw new Error(error.message);
      return toTransporter(data);
    },
    onSuccess: (newTransporter) => {
      queryClient.setQueryData<Transporter[]>(
        queryKeys.transporters.all,
        (old = []) => [...old, newTransporter]
      );
      toast.success(`Transporter "${newTransporter.name}" added`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add transporter: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transporters.all });
    },
  });
};

export const useUpdateTransporter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transporter: Transporter) => {
      const { data, error } = await supabase
        .from("transporters")
        .update(toDbInsert(transporter))
        .eq("id", transporter.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return toTransporter(data);
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transporters.all });
      const previous = queryClient.getQueryData<Transporter[]>(
        queryKeys.transporters.all
      );

      if (previous) {
        queryClient.setQueryData<Transporter[]>(
          queryKeys.transporters.all,
          previous.map((t) => (t.id === updated.id ? updated : t))
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.transporters.all, context.previous);
      }
      toast.error(`Failed to update transporter: ${error.message}`);
    },
    onSuccess: (transporter) => {
      toast.success(`Transporter "${transporter.name}" updated`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transporters.all });
    },
  });
};

export const useToggleTransporterActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("transporters")
        .update({ active })
        .eq("id", id);

      if (error) throw new Error(error.message);
      return { id, active };
    },
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transporters.all });
      const previous = queryClient.getQueryData<Transporter[]>(
        queryKeys.transporters.all
      );

      if (previous) {
        queryClient.setQueryData<Transporter[]>(
          queryKeys.transporters.all,
          previous.map((t) => (t.id === id ? { ...t, active } : t))
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.transporters.all, context.previous);
      }
      toast.error(`Failed to update status: ${error.message}`);
    },
    onSuccess: ({ active }) => {
      toast.success(`Transporter ${active ? "activated" : "deactivated"}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transporters.all });
    },
  });
};
