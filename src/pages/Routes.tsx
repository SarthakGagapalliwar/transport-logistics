import React from "react";
import { Helmet } from "react-helmet";
import PageTransition from "@/components/ui-custom/PageTransition";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { DataTable } from "@/components/ui-custom/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Trash,
  MapPin,
  FileText,
  DollarSign,
  Package,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRoutes } from "@/hooks/use-routes";
import { useAuth } from "@/context/AuthContext";
import { Column } from "@/types/data-table";
import { usePackages } from "@/hooks/use-packages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useShipments from "@/hooks/use-shipments";

const RoutesPage = () => {
  const {
    routes,
    isLoading,
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
    isSubmitting,
    isDeleting,
  } = useRoutes();

  const { packages, activePackages } = useShipments();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  // Columns for the data table
  const columns: Column[] = [
    {
      header: "Package",
      accessorKey: "assignedPackageId",
      cell: (row: any) => {
        if (!row.assignedPackageId) return "None";
        const pkg = packages.find((p) => p.id === row.assignedPackageId);
        return pkg ? pkg.name : "Unknown";
      },
    },
    {
      header: "Origin",
      accessorKey: "source",
    },
    {
      header: "Destination",
      accessorKey: "destination",
    },
    {
      header: "Distance",
      accessorKey: "distanceKm",
    },
    {
      header: "Billing Rate",
      accessorKey: "billingRatePerTon",
    },
    {
      header: "Vendor Rate",
      accessorKey: "vendorRatePerTon",
    }
  ];

  if (user?.role === "admin") {
    columns.push({
      header: "Actions",
      accessorKey: "actions",
      cell: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleEditRoute(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {/* <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDeleteRoute(row.id)}
            disabled={isDeleting}
          >
            <Trash className="h-4 w-4" />
          </Button> */}
        </div>
      ),
    });
  }

  // For mobile, show fewer columns
  const mobileColumns = isMobile
    ? columns.filter((col) => {
        if (typeof col.header === "string") {
          return ["Package",  "Origin", "Destination", "Distance", "Billing Rate", "Vendor Rate", "Actions"].includes(
            col.header
          );
        }
        return false;
      })
    : columns;

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>Routes | Transport</title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
              <p className="text-muted-foreground">
                Manage transportation routes and their details
              </p>
            </div>
            {user?.role === "admin" ? (
              <Button onClick={handleAddRoute}>
                <Plus className="mr-2 h-4 w-4" /> Add Route
              </Button>
            ) : (
              <div></div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Routes List</CardTitle>
              <CardDescription>
                View and manage all available transportation routes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <DataTable
                  data={routes}
                  columns={mobileColumns}
                  searchKey="source"
                  searchPlaceholder="Search routes..."
                />
              )}
            </CardContent>
          </Card>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedRoute ? "Edit Route" : "Add New Route"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for the transportation route
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="assignedPackageId">Assign to Package</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Select
                        value={formData.assignedPackageId}
                        onValueChange={(value) =>
                          handleSelectChange("assignedPackageId", value)
                        }
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {activePackages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source">Origin</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="source"
                        name="source"
                        placeholder="Enter origin location"
                        className="pl-10"
                        value={formData.source}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="destination"
                        name="destination"
                        placeholder="Enter destination location"
                        className="pl-10"
                        value={formData.destination}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="distanceKm">Distance (km)</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="distanceKm"
                        name="distanceKm"
                        type="number"
                        placeholder="Enter distance in kilometers"
                        className="pl-10"
                        value={formData.distanceKm}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billingRatePerTon">
                      Billing Rate (₹/ton)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="billingRatePerTon"
                        name="billingRatePerTon"
                        type="number"
                        placeholder="Enter billing rate per ton"
                        className="pl-10"
                        value={formData.billingRatePerTon}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendorRatePerTon">
                      Vendor Rate (₹/ton)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="vendorRatePerTon"
                        name="vendorRatePerTon"
                        type="number"
                        placeholder="Enter vendor rate per ton"
                        className="pl-10"
                        value={formData.vendorRatePerTon}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                        {selectedRoute ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{selectedRoute ? "Update" : "Add"} Route</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default RoutesPage;
