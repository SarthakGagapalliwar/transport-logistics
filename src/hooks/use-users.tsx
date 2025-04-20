import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { usePackages, fetchPackages } from '@/hooks/use-packages';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
  assignedPackages?: string[];
}

interface UserFormData {
  name: string;
  email: string;
  role: string;
  password: string;
  assignedPackages: string[];
}

export const useUsers = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'user',
    password: '',
    assignedPackages: [],
  });

  // Query to fetch packages 
  const { data: availablePackages = [], isLoading: isLoadingPackages } = useQuery({
    queryKey: ['packages'],
    queryFn: fetchPackages,
  });

  // Query to fetch users from profiles table
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        // Get profiles with roles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }
        
        // Transform the profiles data
        const userProfiles = profiles.map(profile => ({
          id: profile.id,
          username: profile.username,
          email: profile.email || '', // If email is stored in profiles, use it
          role: profile.role,
          active: profile.active,
          assignedPackages: profile.assigned_packages || []
        }));
        
        return userProfiles as User[];
      } catch (error) {
        console.error('Error in user fetching:', error);
        throw error;
      }
    },
  });

  // Mutation to update a user
  const updateUserMutation = useMutation({
    mutationFn: async (user: User & { assignedPackages?: string[] }) => {
      // First update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: user.username,
          active: user.active
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;

      // Then update the user role using our new function
      const { error: roleError } = await supabase.rpc('assign_user_role', {
        user_id: user.id,
        user_role: user.role
      });
      
      if (roleError) throw roleError;

      // Update assigned packages if provided
      if (user.assignedPackages) {
        const { error: packageError } = await supabase.rpc('assign_packages_to_user', {
          user_id: user.id,
          package_ids: user.assignedPackages
        });
        
        if (packageError) throw packageError;
      }
      
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  // Mutation to add a new user
  const addUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      // Call the sign up function from Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.name,
          },
        },
      });
      
      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No user data returned from signup');
      }

      // Set the user role using our new function
      const { error: roleError } = await supabase.rpc('assign_user_role', {
        user_id: authData.user.id,
        user_role: userData.role
      });
      
      if (roleError) throw roleError;

      // Assign packages if any
      if (userData.assignedPackages.length > 0) {
        const { error } = await supabase.rpc('assign_packages_to_user', {
          user_id: authData.user.id,
          package_ids: userData.assignedPackages
        });
        
        if (error) {
          console.error('Error assigning packages:', error);
          throw error;
        }
      }
      
      return authData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User added successfully');
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add user: ${error.message}`);
    },
  });

  // Mutation to toggle user access
  const toggleUserAccessMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase.rpc('toggle_user_access', {
        user_id: userId,
        is_active: isActive
      });
      
      if (error) throw error;
      
      return { userId, isActive };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`User ${data.isActive ? 'activated' : 'deactivated'} successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user access: ${error.message}`);
    },
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle package selection changes
  const handlePackageSelectionChange = (selectedPackageIds: string[]) => {
    setFormData(prev => ({ ...prev, assignedPackages: selectedPackageIds }));
  };

  // Set up to edit a user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.username,
      email: user.email,
      role: user.role,
      password: '', // Password field will be disabled in edit mode
      assignedPackages: user.assignedPackages || [],
    });
    setOpenDialog(true);
  };

  // Set up to add a new user
  const handleAddUser = () => {
    setSelectedUser(null);
    resetForm();
    setOpenDialog(true);
  };

  // Reset the form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'user',
      password: '',
      assignedPackages: [],
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedUser) {
      // Update existing user
      updateUserMutation.mutate({
        ...selectedUser,
        username: formData.name,
        role: formData.role,
        assignedPackages: formData.assignedPackages,
      });
    } else {
      // Add new user
      addUserMutation.mutate(formData);
    }
  };

  // Handle toggling user access
  const handleToggleUserAccess = (user: User) => {
    toggleUserAccessMutation.mutate({
      userId: user.id,
      isActive: !user.active
    });
  };

  return {
    users,
    isLoading,
    openDialog,
    setOpenDialog,
    selectedUser,
    setSelectedUser,
    formData,
    setFormData,
    handleInputChange,
    handleSelectChange,
    handleEditUser,
    handleAddUser,
    handleSubmit,
    toggleUserAccessMutation,
    handleToggleUserAccess,
    updateUserMutation,
    addUserMutation,
    isSubmitting: addUserMutation.isPending || updateUserMutation.isPending || toggleUserAccessMutation.isPending,
    availablePackages,
    isLoadingPackages,
    handlePackageSelectionChange,
  };
};
