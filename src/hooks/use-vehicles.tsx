
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

  // Mutation to add a new vehicle with better error handling
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
        throw new Error(error.message);
      }
      
      return {
        ...dbToAppVehicle(data),
        transporterName: data.transporters?.name || 'Unknown',
      };
    },
    onSuccess: (newVehicle) => {
      // Optimistically update the cache
      queryClient.setQueryData(['vehicles'], (old: Vehicle[] = []) => [...old, newVehicle]);
      toast.success(`Vehicle "${newVehicle.vehicleNumber}" added successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add vehicle: ${error.message}`);
    },
    onSettled: () => {
      // Ensure data is fresh after mutation
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    }
  });

  // Mutation to update a vehicle with optimistic updates
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
        throw new Error(error.message);
      }
      
      return {
        ...dbToAppVehicle(data),
        transporterName: data.transporters?.name || 'Unknown',
      };
    },
    onMutate: async (updatedVehicle) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      
      // Snapshot previous value
      const previousVehicles = queryClient.getQueryData<Vehicle[]>(['vehicles']);
      
      // Optimistically update
      if (previousVehicles) {
        queryClient.setQueryData<Vehicle[]>(['vehicles'], 
          previousVehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v)
        );
      }
      
      return { previousVehicles };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousVehicles) {
        queryClient.setQueryData(['vehicles'], context.previousVehicles);
      }
      toast.error(`Failed to update vehicle: ${error.message}`);
    },
    onSuccess: (updatedVehicle) => {
      toast.success(`Vehicle "${updatedVehicle.vehicleNumber}" updated successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
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

  // Handle form submission with better validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.transporterId || !formData.vehicleNumber || !formData.capacity) {
      toast.error('Please fill in all required fields');
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
      vehicleNumber: formData.vehicleNumber,
      vehicleType: finalVehicleType,
      capacity: Number(formData.capacity),
      status: formData.status,
      lastMaintenance: new Date().toISOString(),
      active: true, // Set active to true by default for new vehicles
    };
    
    if (selectedVehicle) {
      // Update existing vehicle
      updateVehicleMutation.mutate({
        id: selectedVehicle.id,
        active: selectedVehicle.active, // Preserve active status on update
        ...vehicleData
      });
    } else {
      // Add new vehicle
      addVehicleMutation.mutate(vehicleData as Omit<Vehicle, 'id'>);
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
  };
};
