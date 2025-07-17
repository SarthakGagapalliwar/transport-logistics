import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, DbVehicle, handleSupabaseError } from '@/lib/supabase';
import { toast } from 'sonner';
import { fetchTransporters } from './use-transporters';

// Type for our app's vehicle format
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

// Convert DB format to app format
const dbToAppVehicle = (dbVehicle: DbVehicle): Vehicle => ({
  id: dbVehicle.id,
  transporterId: dbVehicle.transporter_id,
  vehicleNumber: dbVehicle.vehicle_number,
  vehicleType: dbVehicle.vehicle_type,
  capacity: Number(dbVehicle.capacity),
  status: dbVehicle.status,
  lastMaintenance: dbVehicle.last_maintenance,
  active: dbVehicle.active,
});

// Convert app format to DB format
const appToDbVehicle = (vehicle: Partial<Vehicle>) => ({
  transporter_id: vehicle.transporterId,
  vehicle_number: vehicle.vehicleNumber,
  vehicle_type: vehicle.vehicleType,
  capacity: vehicle.capacity,
  status: vehicle.status,
  last_maintenance: vehicle.lastMaintenance,
  active: vehicle.active,
});

// Isolate the data fetching function
export const fetchVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      transporters:transporter_id (name)
    `)
    .order('vehicle_number');
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data.map((vehicle: any) => ({
    ...dbToAppVehicle(vehicle),
    transporterName: vehicle.transporters?.name || 'Unknown',
  }));
};

export const useVehicles = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Use separate queries for transporters and vehicles
  const { data: allTransporters = [] } = useQuery({
    queryKey: ['transporters'],
    queryFn: fetchTransporters,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Filter out inactive transporters
  const transporters = allTransporters.filter(t => t.active);
  
  const [formData, setFormData] = useState({
    transporterId: '',
    vehicleNumber: '',
    vehicleType: 'Truck',
    customVehicleType: '',
    capacity: '',
    status: 'Available',
  });

  // Query to fetch vehicles with better caching
  const { 
    data: vehicles = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Function to check if vehicle number already exists
  const isVehicleNumberDuplicate = (vehicleNumber: string, excludeId?: string) => {
    return vehicles.some(vehicle => 
      vehicle.vehicleNumber.toLowerCase() === vehicleNumber.toLowerCase() && 
      vehicle.id !== excludeId
    );
  };

  // Mutation to add a new vehicle with optimized performance
  const addVehicleMutation = useMutation({
    mutationFn: async (vehicle: Omit<Vehicle, 'id'>) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert(appToDbVehicle(vehicle))
        .select(`
          *,
          transporters:transporter_id (name)
        `)
        .single();
      
      if (error) {
        // Check if it's a unique constraint violation
        if (error.code === '23505' && error.message.includes('vehicles_vehicle_number_unique')) {
          throw new Error('Vehicle number already exists. Please use a different vehicle number.');
        }
        throw new Error(error.message);
      }
      
      return {
        ...dbToAppVehicle(data),
        transporterName: data.transporters?.name || 'Unknown',
      };
    },
    onMutate: async (newVehicle) => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      
      // Snapshot previous value
      const previousVehicles = queryClient.getQueryData<Vehicle[]>(['vehicles']);
      
      // Create optimistic vehicle with temporary ID
      const optimisticVehicle = {
        id: `temp-${Date.now()}`,
        ...newVehicle,
        transporterName: transporters.find(t => t.id === newVehicle.transporterId)?.name || 'Unknown',
      };
      
      // Optimistically update the cache
      if (previousVehicles) {
        queryClient.setQueryData<Vehicle[]>(['vehicles'], [...previousVehicles, optimisticVehicle]);
      }
      
      return { previousVehicles, optimisticVehicle };
    },
    onSuccess: (newVehicle, _, context) => {
      // Replace optimistic update with real data
      queryClient.setQueryData<Vehicle[]>(['vehicles'], (old: Vehicle[] = []) => 
        old.map(v => v.id === context?.optimisticVehicle.id ? newVehicle : v)
      );
      toast.success(`Vehicle "${newVehicle.vehicleNumber}" added successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error, _, context) => {
      // Rollback optimistic update
      if (context?.previousVehicles) {
        queryClient.setQueryData(['vehicles'], context.previousVehicles);
      }
      console.error('Add vehicle error:', error);
      toast.error(`Failed to add vehicle: ${error.message}`);
    },
    onSettled: () => {
      // Debounced invalidation to prevent multiple refetches
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }, 100);
    }
  });

  // Mutation to update a vehicle with optimized performance
  const updateVehicleMutation = useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(appToDbVehicle(vehicle))
        .eq('id', vehicle.id)
        .select(`
          *,
          transporters:transporter_id (name)
        `)
        .single();
      
      if (error) {
        // Check if it's a unique constraint violation
        if (error.code === '23505' && error.message.includes('vehicles_vehicle_number_unique')) {
          throw new Error('Vehicle number already exists. Please use a different vehicle number.');
        }
        throw new Error(error.message);
      }
      
      return {
        ...dbToAppVehicle(data),
        transporterName: data.transporters?.name || 'Unknown',
      };
    },
    onMutate: async (updatedVehicle) => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      
      // Snapshot previous value
      const previousVehicles = queryClient.getQueryData<Vehicle[]>(['vehicles']);
      
      // Add transporter name for optimistic update
      const enhancedVehicle = {
        ...updatedVehicle,
        transporterName: transporters.find(t => t.id === updatedVehicle.transporterId)?.name || 'Unknown',
      };
      
      // Optimistically update with enhanced data
      if (previousVehicles) {
        queryClient.setQueryData<Vehicle[]>(['vehicles'], 
          previousVehicles.map(v => v.id === updatedVehicle.id ? enhancedVehicle : v)
        );
      }
      
      return { previousVehicles };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousVehicles) {
        queryClient.setQueryData(['vehicles'], context.previousVehicles);
      }
      console.error('Update vehicle error:', error);
      toast.error(`Failed to update vehicle: ${error.message}`);
    },
    onSuccess: (updatedVehicle) => {
      // Update cache with real data from server
      queryClient.setQueryData<Vehicle[]>(['vehicles'], (old: Vehicle[] = []) =>
        old.map(v => v.id === updatedVehicle.id ? updatedVehicle : v)
      );
      toast.success(`Vehicle "${updatedVehicle.vehicleNumber}" updated successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onSettled: () => {
      // Debounced invalidation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }, 100);
    }
  });

  // Mutation to delete a vehicle
  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      const previousVehicles = queryClient.getQueryData<Vehicle[]>(['vehicles']);
      
      if (previousVehicles) {
        queryClient.setQueryData<Vehicle[]>(['vehicles'], 
          previousVehicles.filter(v => v.id !== deletedId)
        );
      }
      
      return { previousVehicles };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousVehicles) {
        queryClient.setQueryData(['vehicles'], context.previousVehicles);
      }
      toast.error(`Failed to delete vehicle: ${error.message}`);
    },
    onSuccess: (_, deletedId) => {
      const deletedVehicle = vehicles.find(v => v.id === deletedId);
      if (deletedVehicle) {
        toast.success(`Vehicle "${deletedVehicle.vehicleNumber}" deleted successfully`);
      } else {
        toast.success('Vehicle deleted successfully');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    }
  });

  // Mutation to toggle vehicle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      const { error } = await supabase
        .from('vehicles')
        .update({ active: !vehicle.active })
        .eq('id', vehicle.id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return { ...vehicle, active: !vehicle.active };
    },
    onMutate: async (vehicle) => {
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      const previousVehicles = queryClient.getQueryData<Vehicle[]>(['vehicles']);
      
      if (previousVehicles) {
        queryClient.setQueryData<Vehicle[]>(['vehicles'], 
          previousVehicles.map(v => v.id === vehicle.id ? { ...v, active: !v.active } : v)
        );
      }
      
      return { previousVehicles };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousVehicles) {
        queryClient.setQueryData(['vehicles'], context.previousVehicles);
      }
      toast.error(`Failed to update vehicle status: ${error.message}`);
    },
    onSuccess: (updatedVehicle) => {
      toast.success(
        `Vehicle "${updatedVehicle.vehicleNumber}" ${
          updatedVehicle.active ? 'activated' : 'deactivated'
        } successfully`
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    }
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

  // Set up to edit a vehicle
  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      transporterId: vehicle.transporterId,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      customVehicleType: '',
      capacity: vehicle.capacity.toString(),
      status: vehicle.status,
    });
    setOpenDialog(true);
  };

  // Set up to add a new vehicle
  const handleAddVehicle = () => {
    setSelectedVehicle(null);
    resetForm();
    setOpenDialog(true);
  };

  // Reset the form
  const resetForm = () => {
    setFormData({
      transporterId: '',
      vehicleNumber: '',
      vehicleType: 'Truck',
      customVehicleType: '',
      capacity: '',
      status: 'Available',
    });
  };

  // Handle form submission with optimized performance
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (addVehicleMutation.isPending || updateVehicleMutation.isPending) {
      return;
    }
    
    // Basic validation
    if (!formData.transporterId || !formData.vehicleNumber || !formData.capacity) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate capacity is a positive number
    const capacity = Number(formData.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      toast.error('Please enter a valid capacity');
      return;
    }

    // Check for duplicate vehicle number (client-side validation)
    const isDuplicate = isVehicleNumberDuplicate(
      formData.vehicleNumber, 
      selectedVehicle?.id
    );
    
    if (isDuplicate) {
      toast.error('Vehicle number already exists. Please use a different vehicle number.');
      return;
    }
    
    // If vehicle type is "Other", use the custom type instead
    const finalVehicleType = formData.vehicleType === 'Other' 
      ? formData.customVehicleType 
      : formData.vehicleType;
    
    if (formData.vehicleType === 'Other' && !formData.customVehicleType) {
      toast.error('Please specify the custom vehicle type');
      return;
    }
    
    const vehicleData = {
      transporterId: formData.transporterId,
      vehicleNumber: formData.vehicleNumber.trim(),
      vehicleType: finalVehicleType,
      capacity,
      status: formData.status,
      lastMaintenance: selectedVehicle?.lastMaintenance || new Date().toISOString(),
      active: true, // Set active to true by default for new vehicles
    };
    
    try {
      if (selectedVehicle) {
        // Update existing vehicle
        await updateVehicleMutation.mutateAsync({
          id: selectedVehicle.id,
          active: selectedVehicle.active, // Preserve active status on update
          ...vehicleData
        });
      } else {
        // Add new vehicle
        await addVehicleMutation.mutateAsync(vehicleData as Omit<Vehicle, 'id'>);
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
      console.error('Form submission error:', error);
    }
  };

  // Handle vehicle deletion
  const handleDeleteVehicle = (id: string) => {
    deleteVehicleMutation.mutate(id);
  };

  // Handle toggling vehicle active status
  const handleToggleActive = (vehicle: Vehicle) => {
    toggleActiveMutation.mutate(vehicle);
  };

  return {
    vehicles,
    isLoading,
    error,
    openDialog,
    setOpenDialog,
    selectedVehicle,
    formData,
    handleInputChange,
    handleSelectChange,
    handleEditVehicle,
    handleAddVehicle,
    handleSubmit,
    handleDeleteVehicle,
    handleToggleActive,
    isSubmitting: addVehicleMutation.isPending || updateVehicleMutation.isPending,
    isDeleting: deleteVehicleMutation.isPending,
    isToggling: toggleActiveMutation.isPending,
    transporters,
    isVehicleNumberDuplicate,
  };
};
