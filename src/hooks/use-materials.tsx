import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, DbMaterial } from '@/lib/supabase';
import { toast } from 'sonner';

// Type for our app's material format
export interface Material {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  status: string;
}

// Convert DB format to app format
const dbToAppMaterial = (dbMaterial: DbMaterial): Material => ({
  id: dbMaterial.id,
  name: dbMaterial.name,
  description: dbMaterial.description,
  unit: dbMaterial.unit,
  status: dbMaterial.status,
});

// Convert app format to DB format
const appToDbMaterial = (material: Partial<Material>) => ({
  name: material.name,
  description: material.description,
  unit: material.unit,
  status: material.status,
});

// Isolate the data fetching function
export const fetchMaterials = async () => {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name');
    
  if (error) {
    throw new Error(error.message);
  }
  
  return data.map(dbToAppMaterial);
};

export const useMaterials = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'tons',
    status: 'available',
  });

  // Query to fetch materials with optimized caching
  const { 
    data: materials = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['materials'],
    queryFn: fetchMaterials,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Mutation to add a new material
  const addMaterialMutation = useMutation({
    mutationFn: async (material: Omit<Material, 'id'>) => {
      const { data, error } = await supabase
        .from('materials')
        .insert(appToDbMaterial(material))
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return dbToAppMaterial(data);
    },
    onSuccess: (newMaterial) => {
      queryClient.setQueryData(['materials'], (old: Material[] = []) => [...old, newMaterial]);
      toast.success(`Material "${newMaterial.name}" added successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add material: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    }
  });

  // Mutation to update a material
  const updateMaterialMutation = useMutation({
    mutationFn: async (material: Material) => {
      const { data, error } = await supabase
        .from('materials')
        .update(appToDbMaterial(material))
        .eq('id', material.id)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return dbToAppMaterial(data);
    },
    onMutate: async (updatedMaterial) => {
      await queryClient.cancelQueries({ queryKey: ['materials'] });
      const previousMaterials = queryClient.getQueryData<Material[]>(['materials']);
      
      if (previousMaterials) {
        queryClient.setQueryData<Material[]>(['materials'], 
          previousMaterials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m)
        );
      }
      
      return { previousMaterials };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousMaterials) {
        queryClient.setQueryData(['materials'], context.previousMaterials);
      }
      toast.error(`Failed to update material: ${error.message}`);
    },
    onSuccess: (updatedMaterial) => {
      toast.success(`Material "${updatedMaterial.name}" updated successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    }
  });

  // Mutation to delete a material
  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['materials'] });
      const previousMaterials = queryClient.getQueryData<Material[]>(['materials']);
      
      if (previousMaterials) {
        queryClient.setQueryData<Material[]>(['materials'], 
          previousMaterials.filter(m => m.id !== deletedId)
        );
      }
      
      return { previousMaterials };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousMaterials) {
        queryClient.setQueryData(['materials'], context.previousMaterials);
      }
      toast.error(`Failed to delete material: ${error.message}`);
    },
    onSuccess: (_, deletedId) => {
      const deletedMaterial = materials.find(m => m.id === deletedId);
      if (deletedMaterial) {
        toast.success(`Material "${deletedMaterial.name}" deleted successfully`);
      } else {
        toast.success('Material deleted successfully');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    }
  });

  // Handle input changes for text inputs and textareas
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Set up to edit a material
  const handleEditMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setFormData({
      name: material.name,
      description: material.description || '',
      unit: material.unit,
      status: material.status,
    });
    setOpenDialog(true);
  };

  // Set up to add a new material
  const handleAddMaterial = () => {
    setSelectedMaterial(null);
    resetForm();
    setOpenDialog(true);
  };

  // Reset the form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      unit: 'tons',
      status: 'available',
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.unit) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const materialData = {
      name: formData.name,
      description: formData.description || null,
      unit: formData.unit,
      status: formData.status,
    };
    
    if (selectedMaterial) {
      updateMaterialMutation.mutate({
        id: selectedMaterial.id,
        ...materialData
      });
    } else {
      addMaterialMutation.mutate(materialData as Omit<Material, 'id'>);
    }
  };

  // Handle material deletion
  const handleDeleteMaterial = (id: string) => {
    deleteMaterialMutation.mutate(id);
  };

  return {
    materials,
    isLoading,
    error,
    openDialog,
    setOpenDialog,
    selectedMaterial,
    formData,
    handleInputChange,
    handleSelectChange,
    handleEditMaterial,
    handleAddMaterial,
    handleSubmit,
    handleDeleteMaterial,
    deleteMaterialMutation,
    isSubmitting: addMaterialMutation.isPending || updateMaterialMutation.isPending,
    isDeleting: deleteMaterialMutation.isPending,
  };
};
