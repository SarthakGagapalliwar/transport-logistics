
import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { usePackages } from '@/hooks/use-packages';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

const packageSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
});

type PackageFormValues = z.infer<typeof packageSchema>;

const PackageForm = () => {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { 
    selectedPackage, 
    addPackageMutation, 
    updatePackageMutation,
  } = usePackages();

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: '',
    },
  });

  // Update form when selectedPackage changes
  useEffect(() => {
    if (selectedPackage) {
      form.reset({
        name: selectedPackage.name,
      });
    } else {
      form.reset({
        name: '',
      });
    }
  }, [selectedPackage, form]);

  const onSubmit = (values: PackageFormValues) => {
    const packageData = {
      name: values.name,
    };

    if (selectedPackage) {
      updatePackageMutation.mutate({
        id: selectedPackage.id,
        ...packageData,
      });
    } else {
      addPackageMutation.mutate(packageData);
    }
  };

  const isSubmitting = addPackageMutation.isPending || updatePackageMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-lg font-semibold">
          {selectedPackage ? 'Edit Package' : 'Add New Package'}
        </h2>
        
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Package Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedPackage ? 'Update Package' : 'Create Package'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PackageForm;
