import React, { useState, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet";
import PageTransition from "@/components/ui-custom/PageTransition";
import { DataTable } from "@/components/ui-custom/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Package, Ruler, Tag } from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { Column } from "@/types/data-table";
import {
  useMaterialsQuery,
  useAddMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  Material,
  MaterialInput,
} from "@/hooks/use-materials";

// ============================================================================
// Types
// ============================================================================

interface MaterialFormData {
  name: string;
  description: string;
  unit: string;
  status: string;
}

const INITIAL_FORM_DATA: MaterialFormData = {
  name: "",
  description: "",
  unit: "tons",
  status: "available",
};

// ============================================================================
// Helpers
// ============================================================================

const materialToFormData = (material: Material): MaterialFormData => ({
  name: material.name,
  description: material.description || "",
  unit: material.unit,
  status: material.status,
});

const formDataToInput = (form: MaterialFormData): MaterialInput => ({
  name: form.name,
  description: form.description || null,
  unit: form.unit,
  status: form.status,
});

// ============================================================================
// Component
// ============================================================================

const Materials: React.FC = () => {
  const isMobile = useIsMobile();

  // Data query
  const { data: materials = [], isLoading } = useMaterialsQuery();

  // Mutations
  const addMutation = useAddMaterial();
  const updateMutation = useUpdateMaterial();
  const deleteMutation = useDeleteMaterial();

  // Local state
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null
  );
  const [formData, setFormData] = useState<MaterialFormData>(INITIAL_FORM_DATA);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);

  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  // Handlers
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleAddMaterial = useCallback(() => {
    setSelectedMaterial(null);
    setFormData(INITIAL_FORM_DATA);
    setOpenDialog(true);
  }, []);

  const handleEditMaterial = useCallback((material: Material) => {
    setSelectedMaterial(material);
    setFormData(materialToFormData(material));
    setOpenDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (materialToDelete) {
      deleteMutation.mutate(materialToDelete);
      setMaterialToDelete(null);
    }
  }, [materialToDelete, deleteMutation]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const input = formDataToInput(formData);

      if (selectedMaterial) {
        updateMutation.mutate(
          { id: selectedMaterial.id, ...input },
          {
            onSuccess: () => {
              setOpenDialog(false);
              setSelectedMaterial(null);
              setFormData(INITIAL_FORM_DATA);
            },
          }
        );
      } else {
        addMutation.mutate(input, {
          onSuccess: () => {
            setOpenDialog(false);
            setFormData(INITIAL_FORM_DATA);
          },
        });
      }
    },
    [formData, selectedMaterial, addMutation, updateMutation]
  );

  // Table columns
  const columns = useMemo((): Column[] => {
    const baseColumns: Column[] = [
      {
        header: "Name",
        accessorKey: "name",
      },
      {
        header: "Description",
        accessorKey: "description",
        cell: (row: Material) => row.description || "N/A",
      },
      {
        header: "Unit",
        accessorKey: "unit",
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: (row: Material) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              row.status === "available"
                ? "bg-green-100 text-green-800"
                : row.status === "limited"
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {row.status}
          </span>
        ),
      },
      {
        header: "Actions",
        accessorKey: "actions",
        cell: (row: Material) => (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleEditMaterial(row)}
              aria-label="Edit material"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-red-500 hover:text-red-700"
              onClick={() => setMaterialToDelete(row.id)}
              aria-label="Delete material"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];

    return baseColumns;
  }, [handleEditMaterial]);

  const displayColumns = useMemo(() => {
    if (!isMobile) return columns;
    return columns.filter((col) =>
      ["Name", "Status", "Actions"].includes(col.header as string)
    );
  }, [columns, isMobile]);

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>Materials | Transport</title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Materials</h1>
              <p className="text-muted-foreground">
                Manage materials for shipment
              </p>
            </div>
            <Button onClick={handleAddMaterial}>
              <Plus className="mr-2 h-4 w-4" /> Add Material
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Materials List</CardTitle>
              <CardDescription>
                View and manage available materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : materials.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No materials found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleAddMaterial}
                  >
                    Add your first material
                  </Button>
                </div>
              ) : (
                <DataTable
                  data={materials}
                  columns={displayColumns}
                  searchableColumns={["name", "description", "unit", "status"]}
                  searchPlaceholder="Search materials..."
                />
              )}
            </CardContent>
          </Card>

          {/* Add/Edit Dialog */}
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedMaterial ? "Edit Material" : "Add New Material"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for the material
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Material Name</Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter material name"
                      className="pl-10"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter material description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Select
                        name="unit"
                        value={formData.unit}
                        onValueChange={(value) =>
                          handleSelectChange("unit", value)
                        }
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tons">Tons</SelectItem>
                          <SelectItem value="kg">Kilograms</SelectItem>
                          <SelectItem value="cubic_meter">
                            Cubic Meters
                          </SelectItem>
                          <SelectItem value="liters">Liters</SelectItem>
                          <SelectItem value="pieces">Pieces</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Select
                        name="status"
                        value={formData.status}
                        onValueChange={(value) =>
                          handleSelectChange("status", value)
                        }
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="limited">Limited</SelectItem>
                          <SelectItem value="unavailable">
                            Unavailable
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenDialog(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                        {selectedMaterial ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{selectedMaterial ? "Update" : "Add"} Material</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={!!materialToDelete}
            onOpenChange={(open) => !open && setMaterialToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  material and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default Materials;
