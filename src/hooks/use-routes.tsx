import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, DbRoute } from '@/lib/supabase';
import { toast } from 'sonner';
import { fetchPackages } from './use-packages';

// Type for our app's route format
export interface Route {
  id: string;
  source: string;
  destination: string;
  distanceKm: number;
  billingRatePerTon: number;
  vendorRatePerTon: number;
  estimatedTime: number;
  assignedPackageId?: string;
}

// Convert DB format to app format
const dbToAppRoute = (dbRoute: DbRoute): Route => ({
  id: dbRoute.id,
  source: dbRoute.source,
  destination: dbRoute.destination,
  distanceKm: Number(dbRoute.distance_km),
  billingRatePerTon: Number(dbRoute.billing_rate_per_ton),
  vendorRatePerTon: Number(dbRoute.vendor_rate_per_ton),
  estimatedTime: Number(dbRoute.estimated_time),
  assignedPackageId: dbRoute.assigned_package_id,
});

// Convert app format to DB format
const appToDbRoute = (route: Partial<Route>) => ({
  source: route.source,
  destination: route.destination,
  distance_km: route.distanceKm,
  billing_rate_per_ton: route.billingRatePerTon,
  vendor_rate_per_ton: route.vendorRatePerTon,
  estimated_time: route.estimatedTime || 0,
  assigned_package_id: route.assignedPackageId && route.assignedPackageId !== "none" ? route.assignedPackageId : null,
});

// Isolate the data fetching function
export const fetchRoutes = async () => {
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .order('source');
  
  if (error) {
    throw new Error(error.message);
  }
  
  return (data as DbRoute[]).map(dbToAppRoute);
};

export const useRoutes = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    distanceKm: '',
    billingRatePerTon: '',
    vendorRatePerTon: '',
    estimatedTime: '',
    assignedPackageId: 'none',
  });

  // Query to fetch routes
  const { 
    data: routes = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['routes'],
    queryFn: fetchRoutes,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
  });
  
  // Query to fetch packages for assignment
  const { data: packages = [] } = useQuery({
    queryKey: ['packagesForRoutes'],
    queryFn: fetchPackages,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation to add a new route
  const addRouteMutation = useMutation({
    mutationFn: async (route: Omit<Route, 'id'>) => {
      const { data, error } = await supabase
        .from('routes')
        .insert(appToDbRoute(route))
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return dbToAppRoute(data as DbRoute);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success(`Route "${formData.source} to ${formData.destination}" added successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add route: ${error.message}`);
    }
  });

  // Mutation to update a route
  const updateRouteMutation = useMutation({
    mutationFn: async (route: Route) => {
      const { error } = await supabase
        .from('routes')
        .update(appToDbRoute(route))
        .eq('id', route.id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return route;
    },
    onSuccess: (route) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success(`Route "${route.source} to ${route.destination}" updated successfully`);
      setOpenDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update route: ${error.message}`);
    }
  });

  // Mutation to delete a route
  const deleteRouteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      
      // Find the deleted route's name for the success message
      const deletedRoute = routes.find(r => r.id === variables);
      if (deletedRoute) {
        toast.success(`Route "${deletedRoute.source} to ${deletedRoute.destination}" deleted successfully`);
      } else {
        toast.success('Route deleted successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete route: ${error.message}`);
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

  // Set up to edit a route
  const handleEditRoute = (route: Route) => {
    setSelectedRoute(route);
    setFormData({
      source: route.source,
      destination: route.destination,
      distanceKm: route.distanceKm.toString(),
      billingRatePerTon: route.billingRatePerTon.toString(),
      vendorRatePerTon: route.vendorRatePerTon.toString(),
      estimatedTime: route.estimatedTime.toString(),
      assignedPackageId: route.assignedPackageId || 'none',
    });
    setOpenDialog(true);
  };

  // Set up to add a new route
  const handleAddRoute = () => {
    setSelectedRoute(null);
    resetForm();
    setOpenDialog(true);
  };

  // Reset the form
  const resetForm = () => {
    setFormData({
      source: '',
      destination: '',
      distanceKm: '',
      billingRatePerTon: '',
      vendorRatePerTon: '',
      estimatedTime: '',
      assignedPackageId: 'none',
    });
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const routeData = {
      source: formData.source,
      destination: formData.destination,
      distanceKm: Number(formData.distanceKm),
      billingRatePerTon: Number(formData.billingRatePerTon),
      vendorRatePerTon: Number(formData.vendorRatePerTon),
      estimatedTime: Number(formData.estimatedTime || '0'),
      assignedPackageId: formData.assignedPackageId === 'none' ? undefined : formData.assignedPackageId,
    };
    
    if (selectedRoute) {
      // Update existing route
      updateRouteMutation.mutate({
        id: selectedRoute.id,
        ...routeData
      });
    } else {
      // Add new route
      addRouteMutation.mutate(routeData as Omit<Route, 'id'>);
    }
  };

  // Handle route deletion
  const handleDeleteRoute = (id: string) => {
    deleteRouteMutation.mutate(id);
  };

  return {
    routes,
    isLoading,
    error,
    openDialog,
    setOpenDialog,
    selectedRoute,
    formData,
    handleInputChange,
    handleSelectChange,
    handleEditRoute,
    handleAddRoute,
    handleSubmit,
    handleDeleteRoute,
    isSubmitting: addRouteMutation.isPending || updateRouteMutation.isPending,
    isDeleting: deleteRouteMutation.isPending,
  };
};
