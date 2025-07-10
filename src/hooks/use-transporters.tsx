
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, DbTransporter } from '@/lib/supabase';
import { toast } from 'sonner';

// Type for our app's transporter format
export interface Transporter {
  id: string;
  name: string;
  gstn: string;
  contactPerson: string;
  contactNumber: string;
  address: string;
  active: boolean;
}

// Convert DB format to app format
const dbToAppTransporter = (dbTransporter: DbTransporter): Transporter => ({
  id: dbTransporter.id,
  name: dbTransporter.name,
  gstn: dbTransporter.gstn,
  contactPerson: dbTransporter.contact_person,
  contactNumber: dbTransporter.contact_number,
  address: dbTransporter.address,
  active: dbTransporter.active,
});

// Convert app format to DB format
const appToDbTransporter = (transporter: Partial<Transporter>) => ({
  name: transporter.name,
  gstn: transporter.gstn,
  contact_person: transporter.contactPerson,
  contact_number: transporter.contactNumber,
  address: transporter.address,
  active: transporter.active,
});

// Isolate the data fetching function
export const fetchTransporters = async () => {
  const { data, error } = await supabase
    .from('transporters')
    .select('*')
    .order('name');
    
  if (error) {
    throw new Error(error.message);
  }
  
  return data.map(dbToAppTransporter);
};

export const useTransporters = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    gstn: '',
    contactPerson: '',
    contactNumber: '',
    address: '',
  });

  // Query to fetch transporters with optimized caching
  const { 
    data: transporters = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['transporters'],
    queryFn: fetchTransporters,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Mutation to add a new transporter
  const addTransporterMutation = useMutation({
    mutationFn: async (transporter: Omit<Transporter, 'id'>) => {
      const { data, error } = await supabase
        .from('transporters')
        .insert(appToDbTransporter(transporter))
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return dbToAppTransporter(data);
    },
    onSuccess: (newTransporter) => {
      // Optimistically update the cache
      queryClient.setQueryData(['transporters'], (old: Transporter[] = []) => [...old, newTransporter]);
      toast.success(`Transporter "${newTransporter.name}" added successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add transporter: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
    }
  });

  // Mutation to update a transporter
  const updateTransporterMutation = useMutation({
    mutationFn: async (transporter: Transporter) => {
      const { data, error } = await supabase
        .from('transporters')
        .update(appToDbTransporter(transporter))
        .eq('id', transporter.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return dbToAppTransporter(data);
    },
    onMutate: async (updatedTransporter) => {
      await queryClient.cancelQueries({ queryKey: ['transporters'] });
      const previousTransporters = queryClient.getQueryData<Transporter[]>(['transporters']);
      
      if (previousTransporters) {
        queryClient.setQueryData<Transporter[]>(['transporters'], 
          previousTransporters.map(t => t.id === updatedTransporter.id ? updatedTransporter : t)
        );
      }
      
      return { previousTransporters };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousTransporters) {
        queryClient.setQueryData(['transporters'], context.previousTransporters);
      }
      toast.error(`Failed to update transporter: ${error.message}`);
    },
    onSuccess: (updatedTransporter) => {
      toast.success(`Transporter "${updatedTransporter.name}" updated successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
    }
  });

  // Mutation to toggle transporter active status
  const toggleActiveMutation = useMutation({
    mutationFn: async (transporter: Transporter) => {
      const { error } = await supabase
        .from('transporters')
        .update({ active: !transporter.active })
        .eq('id', transporter.id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return { ...transporter, active: !transporter.active };
    },
    onMutate: async (transporter) => {
      await queryClient.cancelQueries({ queryKey: ['transporters'] });
      const previousTransporters = queryClient.getQueryData<Transporter[]>(['transporters']);
      
      if (previousTransporters) {
        queryClient.setQueryData<Transporter[]>(['transporters'], 
          previousTransporters.map(t => t.id === transporter.id ? { ...t, active: !t.active } : t)
        );
      }
      
      return { previousTransporters };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousTransporters) {
        queryClient.setQueryData(['transporters'], context.previousTransporters);
      }
      toast.error(`Failed to update transporter status: ${error.message}`);
    },
    onSuccess: (updatedTransporter) => {
      toast.success(
        `Transporter "${updatedTransporter.name}" ${
          updatedTransporter.active ? 'activated' : 'deactivated'
        } successfully`
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Set up to edit a transporter
  const handleEditTransporter = (transporter: Transporter) => {
    setSelectedTransporter(transporter);
    setFormData({
      name: transporter.name,
      gstn: transporter.gstn,
      contactPerson: transporter.contactPerson,
      contactNumber: transporter.contactNumber,
      address: transporter.address,
    });
    setOpenDialog(true);
  };

  // Set up to add a new transporter
  const handleAddTransporter = () => {
    setSelectedTransporter(null);
    resetForm();
    setOpenDialog(true);
  };

  // Reset the form
  const resetForm = () => {
    setFormData({
      name: '',
      gstn: '',
      contactPerson: '',
      contactNumber: '',
      address: '',
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.gstn || !formData.contactPerson || !formData.contactNumber || !formData.address) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const transporterData = {
      ...formData,
      active: true, // Set active to true by default for new transporters
    };
    
    if (selectedTransporter) {
      // Update existing transporter
      updateTransporterMutation.mutate({
        id: selectedTransporter.id,
        active: selectedTransporter.active, // Preserve active status on update
        ...transporterData
      });
    } else {
      // Add new transporter
      addTransporterMutation.mutate(transporterData as Omit<Transporter, 'id'>);
    }
  };

  // Handle toggling transporter active status
  const handleToggleActive = (transporter: Transporter) => {
    toggleActiveMutation.mutate(transporter);
  };

  return {
    transporters,
    isLoading,
    error,
    openDialog,
    setOpenDialog,
    selectedTransporter,
    formData,
    handleInputChange,
    handleEditTransporter,
    handleAddTransporter,
    handleSubmit,
    handleToggleActive,
    isSubmitting: addTransporterMutation.isPending || updateTransporterMutation.isPending,
    isToggling: toggleActiveMutation.isPending,
  };
};
