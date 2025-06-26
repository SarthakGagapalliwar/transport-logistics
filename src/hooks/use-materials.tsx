
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
  console.log('Fetching materials...');
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching materials:', error);
    throw new Error(error.message);
  }

  console.log('Materials fetched successfully:', data);
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
    unit: 'tons', // Default unit
    status: 'available',
  });

  // Query to fetch materials
  const { 
    data: materials = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['materials'],
    queryFn: fetchMaterials
  });

  // Mutation to add a new material
  const addMaterialMutation = useMutation({
    mutationFn: async (material: Omit<Material, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Adding material:', material);
      
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
        console.error('Error adding material:', error);
        throw new Error(error.message);
      }

      console.log('Material added successfully:', data);
      return data as Material;
    },
    onSuccess: (data) => {
      console.log('Add material mutation successful:', data);
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material added successfully');
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Add material mutation failed:', error);
      toast.error(`Failed to add material: ${error.message}`);
    }
  });

  // Mutation to update an existing material
  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, ...material }: Partial<Material> & { id: string }) => {
      console.log('Updating material:', id, material);
      
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
        console.error('Error updating material:', error);
        throw new Error(error.message);
      }

      console.log('Material updated successfully:', data);
      return data as Material;
    },
    onSuccess: (data) => {
      console.log('Update material mutation successful:', data);
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material updated successfully');
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Update material mutation failed:', error);
      toast.error(`Failed to update material: ${error.message}`);
    }
  });

  // Mutation to delete a material
  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting material:', id);
      
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting material:', error);
        throw new Error(error.message);
      }

      console.log('Material deleted successfully');
      return id;
    },
    onSuccess: () => {
      console.log('Delete material mutation successful');
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Material deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Delete material mutation failed:', error);
      toast.error(`Failed to delete material: ${error.message}`);
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('Form input changed:', name, value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Set up to edit a material
  const handleEditMaterial = (material: Material) => {
    console.log('Editing material:', material);
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
    console.log('Adding new material');
    setSelectedMaterial(null);
    resetForm();
    setOpenDialog(true);
  };

  // Reset the form
  const resetForm = () => {
    console.log('Resetting form');
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
    console.log('Form submitted:', formData, 'Selected material:', selectedMaterial);
    
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
      // Update existing material
      console.log('Updating existing material');
      updateMaterialMutation.mutate({
        id: selectedMaterial.id,
        ...materialData
      });
    } else {
      // Add new material
      console.log('Adding new material');
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
