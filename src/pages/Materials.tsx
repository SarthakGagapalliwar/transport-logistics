import React from "react";
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
  Plus,
  Edit,
  Trash2,
  Package,
  Ruler,
  Tag,
} from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMaterials } from "@/hooks/use-materials";
import { format } from "date-fns";
import { Column } from "@/types/data-table";
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

const Materials = () => {
  const {
    materials,
    isLoading,
    openDialog,
    setOpenDialog,
    selectedMaterial,
    formData,
    handleInputChange,
    handleEditMaterial,
    handleAddMaterial,
    handleSubmit,
    isSubmitting,
    deleteMaterialMutation,
  } = useMaterials();

  const isMobile = useIsMobile();
  const [materialToDelete, setMaterialToDelete] = React.useState<string | null>(null);

  const columns: Column[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "Description",
      accessorKey: "description",
      cell: (row: any) => row.description || "N/A",
    },
    {
      header: "Unit",
      accessorKey: "unit",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.status === "available"
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Created",
      accessorKey: "created_at",
      cell: (row: any) => format(new Date(row.created_at), "MMM d, yyyy"),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleEditMaterial(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-red-500 hover:text-red-700"
            onClick={() => setMaterialToDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const mobileColumns = isMobile
    ? columns.filter((col) => ["Name", "Status", "Actions"].includes(col.header as string))
    : columns;

  const handleDeleteConfirm = () => {
    if (materialToDelete) {
      deleteMaterialMutation.mutate(materialToDelete);
      setMaterialToDelete(null);
    }
  };

  const handleUnitChange = (value: string) => {
    handleInputChange({
      target: { name: 'unit', value }
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  const handleStatusChange = (value: string) => {
    handleInputChange({
      target: { name: 'status', value }
    } as React.ChangeEvent<HTMLSelectElement>);
  };

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
              <p className="text-muted-foreground">Manage materials for shipment</p>
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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                  columns={mobileColumns}
                  searchableColumns={["name", "description", "unit", "status"]}
                  searchPlaceholder="Search materials..."
                />
              )}
            </CardContent>
          </Card>

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
                        onValueChange={handleUnitChange}
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tons">Tons</SelectItem>
                          <SelectItem value="kg">Kilograms</SelectItem>
                          <SelectItem value="cubic_meter">Cubic Meters</SelectItem>
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
                        onValueChange={handleStatusChange}
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="limited">Limited</SelectItem>
                          <SelectItem value="unavailable">Unavailable</SelectItem>
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
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
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
