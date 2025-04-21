
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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from 'lucide-react';

const packageSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  active: z.boolean().default(true),
});

type PackageFormValues = z.infer<typeof packageSchema>;

const PackageForm = () => {
  const { user } = useAuth();
  const { 
    selectedPackage, 
    addPackageMutation, 
    updatePackageMutation,
  } = usePackages();

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: '',
      active: true,
    },
  });

  // Update form when selectedPackage changes
  useEffect(() => {
    if (selectedPackage) {
      form.reset({
        name: selectedPackage.name,
        active: selectedPackage.active,
      });
    } else {
      form.reset({
        name: '',
        active: true,
      });
    }
  }, [selectedPackage, form]);

  const onSubmit = (values: PackageFormValues) => {
    if (selectedPackage) {
      updatePackageMutation.mutate({
        id: selectedPackage.id,
        name: values.name, // Ensure name is required
        active: values.active,
      });
    } else {
      addPackageMutation.mutate({
        name: values.name, // Ensure name is required
        active: values.active,
      });
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

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active Status</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    {field.value ? 'Package is active and can be assigned to shipments' : 'Package is inactive and cannot be assigned to new shipments'}
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
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
