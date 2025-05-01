
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { fetchPackages } from '@/hooks/use-packages';

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
  const { 
    data: users = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
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
        
        // Get emails for users if admin
        const userProfiles = await Promise.all(profiles.map(async (profile) => {
          // Try to get the email from the function
          const { data: emailData, error: emailError } = await supabase
            .rpc('get_user_email', { user_id: profile.id });
          
          const email = emailData && emailData.length > 0 ? emailData[0].email : '';
          
          return {
            id: profile.id,
            username: profile.username,
            email: email || profile.email || '',
            role: profile.role,
            active: profile.active !== undefined ? profile.active : true,
            assignedPackages: profile.assigned_packages || []
          };
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
      console.log('Updating user:', user);
      
      // First update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: user.username,
          active: user.active
        })
        .eq('id', user.id);
      
      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      // Then update the user role
      const { error: roleError } = await supabase.rpc('assign_user_role', {
        user_id: user.id,
        user_role: user.role
      });
      
      if (roleError) {
        console.error('Role update error:', roleError);
        throw roleError;
      }

      // Update assigned packages if provided
      if (user.assignedPackages) {
        const { error: packageError } = await supabase.rpc('assign_packages_to_user', {
          user_id: user.id,
          package_ids: user.assignedPackages
        });
        
        if (packageError) {
          console.error('Package assignment error:', packageError);
          throw packageError;
        }
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
      console.error('Update user error:', error);
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  // Mutation to add a new user
  const addUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      try {
        console.log('Adding new user:', userData.email);
        
        // Using built-in Auth API to create user
        const { error: authError, data } = await supabase.functions.invoke('create-user', {
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            username: userData.name,
            role: userData.role
          })
        });
        
        if (authError || !data?.success) {
          throw new Error(authError?.message || data?.error || 'Failed to create user');
        }
        
        const userId = data.user?.id;
        if (!userId) {
          throw new Error('No user ID returned from user creation');
        }
        
        // Assign packages if any
        if (userData.assignedPackages.length > 0) {
          const { error } = await supabase.rpc('assign_packages_to_user', {
            user_id: userId,
            package_ids: userData.assignedPackages
          });
          
          if (error) {
            console.error('Error assigning packages:', error);
            throw error;
          }
        }
        
        return data;
      } catch (error: any) {
        console.error('Add user error:', error);
        throw new Error(error.message || 'An error occurred while creating the user');
      }
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
      console.log('Toggling user access:', userId, isActive);
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
    error,
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
    refetch,
  };
};
