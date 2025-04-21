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
});

// Convert app format to DB format
const appToDbVehicle = (vehicle: Partial<Vehicle>) => ({
  transporter_id: vehicle.transporterId,
  vehicle_number: vehicle.vehicleNumber,
  vehicle_type: vehicle.vehicleType,
  capacity: vehicle.capacity,
  status: vehicle.status,
  last_maintenance: vehicle.lastMaintenance,
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
    queryFn: fetchTransporters
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

  // Query to fetch vehicles
  const { 
    data: vehicles = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles
  });

  // Mutation to add a new vehicle
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`Vehicle "${formData.vehicleNumber}" added successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add vehicle: ${error.message}`);
    }
  });

  // Mutation to update a vehicle
  const updateVehicleMutation = useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      const { error } = await supabase
        .from('vehicles')
        .update(appToDbVehicle(vehicle))
        .eq('id', vehicle.id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return vehicle;
    },
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`Vehicle "${vehicle.vehicleNumber}" updated successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update vehicle: ${error.message}`);
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      // Find the deleted vehicle's info for the success message
      const deletedVehicle = vehicles.find(v => v.id === variables);
      if (deletedVehicle) {
        toast.success(`Vehicle "${deletedVehicle.vehicleNumber}" deleted successfully`);
      } else {
        toast.success('Vehicle deleted successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete vehicle: ${error.message}`);
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

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If vehicle type is "Other", use the custom type instead
    const finalVehicleType = formData.vehicleType === 'Other' 
      ? formData.customVehicleType 
      : formData.vehicleType;
    
    const vehicleData = {
      transporterId: formData.transporterId,
      vehicleNumber: formData.vehicleNumber,
      vehicleType: finalVehicleType,
      capacity: Number(formData.capacity),
      status: formData.status,
      lastMaintenance: new Date().toISOString(),
    };
    
    if (selectedVehicle) {
      // Update existing vehicle
      updateVehicleMutation.mutate({
        id: selectedVehicle.id,
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
    isSubmitting: addVehicleMutation.isPending || updateVehicleMutation.isPending,
    isDeleting: deleteVehicleMutation.isPending,
    transporters,
  };
};
