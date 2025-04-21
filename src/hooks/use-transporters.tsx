import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, DbTransporter, handleSupabaseError } from '@/lib/supabase';
import { toast } from 'sonner';

// Type for our app's transporter format
export interface Transporter {
  id: string;
  name: string;
  gstn: string;
  contactPerson: string;
  contactNumber: string;
  address: string;
}

// Convert DB format to app format
const dbToAppTransporter = (dbTransporter: DbTransporter): Transporter => ({
  id: dbTransporter.id,
  name: dbTransporter.name,
  gstn: dbTransporter.gstn,
  contactPerson: dbTransporter.contact_person,
  contactNumber: dbTransporter.contact_number,
  address: dbTransporter.address,
});

// Convert app format to DB format
const appToDbTransporter = (transporter: Partial<Transporter>) => ({
  name: transporter.name,
  gstn: transporter.gstn,
  contact_person: transporter.contactPerson,
  contact_number: transporter.contactNumber,
  address: transporter.address,
});

// Isolate the data fetching function to avoid circular dependencies
export const fetchTransporters = async () => {
  const { data, error } = await supabase
    .from('transporters')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching transporters:', error);
    throw new Error(error.message);
  }

  return (data as DbTransporter[]).map(dbToAppTransporter);
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

  // Query to fetch transporters
  const { 
    data: transporters = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['transporters'],
    queryFn: fetchTransporters
  });

  // Mutation to add a new transporter
  const addTransporterMutation = useMutation({
    mutationFn: async (transporter: Omit<Transporter, 'id'>) => {
      try {
        const { data, error } = await supabase
          .from('transporters')
          .insert(appToDbTransporter(transporter))
          .select()
          .single();
        
        if (error) {
          console.error('Error in supabase insert:', error);
          throw new Error(error.message);
        }
        
        return dbToAppTransporter(data as DbTransporter);
      } catch (error) {
        console.error('Error adding transporter:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
      toast.success(`Transporter "${data.name}" added successfully`);
      setOpenDialog(false);
      resetForm();
      // Force a refetch
      setTimeout(() => {
        refetch();
      }, 100);
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast.error(`Failed to add transporter: ${error.message}`);
    }
  });

  // Mutation to update a transporter
  const updateTransporterMutation = useMutation({
    mutationFn: async (transporter: Transporter) => {
      const { error } = await supabase
        .from('transporters')
        .update(appToDbTransporter(transporter))
        .eq('id', transporter.id);
      
      if (error) {
        console.error('Error updating transporter:', error);
        throw new Error(error.message);
      }
      
      return transporter;
    },
    onSuccess: (transporter) => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
      toast.success(`Transporter "${transporter.name}" updated successfully`);
      setOpenDialog(false);
      resetForm();
      // Force a refetch
      setTimeout(() => {
        refetch();
      }, 100);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update transporter: ${error.message}`);
    }
  });

  // Mutation to delete a transporter
  const deleteTransporterMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transporters')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting transporter:', error);
        throw new Error(error.message);
      }
      
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] });
      
      // Find the deleted transporter's name for the success message
      const deletedTransporter = transporters.find(t => t.id === variables);
      if (deletedTransporter) {
        toast.success(`Transporter "${deletedTransporter.name}" deleted successfully`);
      } else {
        toast.success('Transporter deleted successfully');
      }
      
      // Force a refetch
      setTimeout(() => {
        refetch();
      }, 100);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete transporter: ${error.message}`);
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    if (selectedTransporter) {
      // Update existing transporter
      updateTransporterMutation.mutate({
        id: selectedTransporter.id,
        name: formData.name,
        gstn: formData.gstn,
        contactPerson: formData.contactPerson,
        contactNumber: formData.contactNumber,
        address: formData.address,
      });
    } else {
      // Add new transporter
      addTransporterMutation.mutate({
        name: formData.name,
        gstn: formData.gstn,
        contactPerson: formData.contactPerson,
        contactNumber: formData.contactNumber,
        address: formData.address,
      } as Omit<Transporter, 'id'>);
    }
  };

  // Handle transporter deletion
  const handleDeleteTransporter = (id: string) => {
    deleteTransporterMutation.mutate(id);
  };

  return {
    transporters,
    isLoading,
    error,
    openDialog,
    setOpenDialog,
    selectedTransporter,
    formData,
    setFormData,
    handleInputChange,
    handleEditTransporter,
    handleAddTransporter,
    handleSubmit,
    handleDeleteTransporter,
    isSubmitting: addTransporterMutation.isPending || updateTransporterMutation.isPending,
    isDeleting: deleteTransporterMutation.isPending,
  };
};
