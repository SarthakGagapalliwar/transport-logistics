
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Material {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Fetch all materials
export const fetchMaterials = async () => {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Material[];
};

export const useMaterials = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'tons',
    status: 'available',
  });

  // Query to fetch materials
  const { 
    data: materials = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['materials'],
    queryFn: fetchMaterials,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation to add a new material
  const addMaterialMutation = useMutation({
    mutationFn: async (material: Omit<Material, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('materials')
        .insert([{
          name: material.name,
          description: material.description || null,
          unit: material.unit,
          status: material.status
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Material;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material added successfully');
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add material: ${error.message}`);
    }
  });

  // Mutation to update an existing material
  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, ...material }: Partial<Material> & { id: string }) => {
      const { data, error } = await supabase
        .from('materials')
        .update({
          name: material.name,
          description: material.description || null,
          unit: material.unit,
          status: material.status
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Material;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material updated successfully');
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update material: ${error.message}`);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete material: ${error.message}`);
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
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
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Material name is required');
      return;
    }
    
    const materialData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      unit: formData.unit,
      status: formData.status,
    };
    
    if (selectedMaterial) {
      updateMaterialMutation.mutate({
        id: selectedMaterial.id,
        ...materialData
      });
    } else {
      addMaterialMutation.mutate(materialData as Omit<Material, 'id' | 'created_at' | 'updated_at'>);
    }
  };

  const isSubmitting = addMaterialMutation.isPending || updateMaterialMutation.isPending;

  return {
    materials,
    isLoading,
    error,
    openDialog,
    setOpenDialog,
    selectedMaterial,
    formData,
    handleInputChange,
    handleEditMaterial,
    handleAddMaterial,
    handleSubmit,
    isSubmitting,
    deleteMaterialMutation
  };
};
