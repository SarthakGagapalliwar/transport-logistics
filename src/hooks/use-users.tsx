import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys, cacheConfig } from "@/lib/query-keys";
import { toast } from "sonner";
import { usePackagesQuery } from "./use-packages";

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
  assignedPackages?: string[];
}

export interface UserFormData {
  name: string;
  email: string;
  role: string;
  password: string;
  assignedPackages: string[];
}

// ============================================================================
// API Functions
// ============================================================================

const fetchUsers = async (): Promise<User[]> => {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profilesError) throw profilesError;

  // Batch fetch emails - better than N+1 but still not ideal
  // TODO: Consider creating a database view or function that joins auth.users
  const users = await Promise.all(
    profiles.map(async (profile) => {
      const { data: emailData } = await supabase.rpc("get_user_email", {
        user_id: profile.id,
      });
      return {
        id: profile.id,
        username: profile.username,
        email: emailData?.[0]?.email ?? "",
        role: profile.role,
        active: profile.active ?? true,
        assignedPackages: profile.assigned_packages ?? [],
      };
    })
  );

  return users;
};

// ============================================================================
// Query Hook
// ============================================================================

export const useUsersQuery = () => {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: fetchUsers,
    ...cacheConfig.standard,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

export const useAddUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: UserFormData) => {
      const { error: authError, data } = await supabase.functions.invoke(
        "create-user",
        {
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            username: userData.name,
            role: userData.role,
          }),
        }
      );

      if (authError || !data?.success) {
        throw new Error(
          authError?.message || data?.error || "Failed to create user"
        );
      }

      const userId = data.user?.id;
      if (!userId) throw new Error("No user ID returned");

      // Assign packages if any
      if (userData.assignedPackages.length > 0) {
        const { error } = await supabase.rpc("assign_packages_to_user", {
          user_id: userId,
          package_ids: userData.assignedPackages,
        });
        if (error) throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success("User added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add user: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: User & { assignedPackages?: string[] }) => {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username: user.username, active: user.active })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update role
      const { error: roleError } = await supabase.rpc("assign_user_role", {
        user_id: user.id,
        user_role: user.role,
      });

      if (roleError) throw roleError;

      // Update packages if provided
      if (user.assignedPackages) {
        const { error: packageError } = await supabase.rpc(
          "assign_packages_to_user",
          {
            user_id: user.id,
            package_ids: user.assignedPackages,
          }
        );
        if (packageError) throw packageError;
      }

      return user;
    },
    onSuccess: () => {
      toast.success("User updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export const useToggleUserAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      const { error } = await supabase.rpc("toggle_user_access", {
        user_id: userId,
        is_active: isActive,
      });
      if (error) throw error;
      return { userId, isActive };
    },
    onMutate: async ({ userId, isActive }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });
      const previous = queryClient.getQueryData<User[]>(queryKeys.users.all);

      if (previous) {
        queryClient.setQueryData<User[]>(
          queryKeys.users.all,
          previous.map((u) =>
            u.id === userId ? { ...u, active: isActive } : u
          )
        );
      }

      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.users.all, context.previous);
      }
      toast.error(`Failed to update user access: ${error.message}`);
    },
    onSuccess: ({ isActive }) => {
      toast.success(
        `User ${isActive ? "activated" : "deactivated"} successfully`
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async ({
      userId,
      newPassword,
    }: {
      userId: string;
      newPassword: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "change-user-password",
        {
          body: JSON.stringify({ userId, newPassword }),
        }
      );

      if (error || !data?.success) {
        throw new Error(
          error?.message || data?.error || "Failed to change password"
        );
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to change password: ${error.message}`);
    },
  });
};
