import React from "react";
import { Helmet } from "react-helmet";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PageTransition from "@/components/ui-custom/PageTransition";
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
import { Plus, Edit, Truck, Calendar } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { useVehicles } from "@/hooks/use-vehicles";
import { useAuth } from "@/context/AuthContext";

const Vehicles = () => {
  const {
    vehicles,
    isLoading,
    openDialog,
    setOpenDialog,
    selectedVehicle,
    formData,
    handleInputChange,
    handleSelectChange,
    handleEditVehicle,
    handleAddVehicle,
    handleSubmit,
    isSubmitting,
    transporters,
  } = useVehicles();

  const isMobile = useIsMobile();

  const { user } = useAuth();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  const columns = [
    {
      header: "Vehicle Number",
      accessorKey: "vehicleNumber",
    },
    {
      header: "Transporter",
      accessorKey: "transporterName",
    },
    {
      header: "Type",
      accessorKey: "vehicleType",
    },
    {
      header: "Capacity",
      accessorKey: "capacity",
      cell: (row: any) => `${row.capacity} tons`,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.status === "Available"
              ? "bg-green-100 text-green-800"
              : row.status === "In Transit"
              ? "bg-blue-100 text-blue-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Last Maintenance",
      accessorKey: "lastMaintenance",
      cell: (row: any) => formatDate(row.lastMaintenance),
    },
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
            onClick={() => handleEditVehicle(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  const mobileColumns = isMobile
    ? columns.filter((col) =>
        ["Vehicle Number", "Type", "Status", "Actions"].includes(col.header)
      )
    : columns;

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>Vehicles | Coal Logistics Hub</title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
              <p className="text-muted-foreground">
                Manage transportation vehicles and their details
              </p>
            </div>
            {user?.role === "admin" ? (
              <Button onClick={handleAddVehicle}>
                <Plus className="mr-2 h-4 w-4" /> Add Vehicle
              </Button>
            ) : (
              <div></div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vehicles List</CardTitle>
              <CardDescription>
                View and manage all registered vehicles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <DataTable
                  data={vehicles}
                  columns={mobileColumns}
                  searchKey="vehicleNumber"
                  searchPlaceholder="Search by vehicle number..."
                />
              )}
            </CardContent>
          </Card>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedVehicle ? "Edit Vehicle" : "Add New Vehicle"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for the vehicle
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transporterId">Transporter</Label>
                    <Select
                      value={formData.transporterId}
                      onValueChange={(value) =>
                        handleSelectChange("transporterId", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transporter" />
                      </SelectTrigger>
                      <SelectContent>
                        {transporters.map((transporter) => (
                          <SelectItem
                            key={transporter.id}
                            value={transporter.id}
                          >
                            {transporter.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <div className="relative">
                      <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="vehicleNumber"
                        name="vehicleNumber"
                        placeholder="Enter vehicle registration number"
                        className="pl-10"
                        value={formData.vehicleNumber}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleType">Vehicle Type</Label>
                    <Select
                      value={formData.vehicleType}
                      onValueChange={(value) =>
                        handleSelectChange("vehicleType", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Truck">Truck</SelectItem>
                        <SelectItem value="Trailer">Trailer</SelectItem>
                        <SelectItem value="Dumper">Dumper</SelectItem>
                        <SelectItem value="Train">Train</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.vehicleType === "Other" && (
                    <div className="space-y-2">
                      <Label htmlFor="customVehicleType">Custom Vehicle Type</Label>
                      <Input
                        id="customVehicleType"
                        name="customVehicleType"
                        placeholder="Enter custom vehicle type"
                        value={formData.customVehicleType || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity (tons)</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="capacity"
                        name="capacity"
                        type="number"
                        min="1"
                        placeholder="Enter capacity in tons"
                        className="pl-10"
                        value={formData.capacity}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        handleSelectChange("status", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
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
                        {selectedVehicle ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{selectedVehicle ? "Update" : "Add"} Vehicle</>
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

export default Vehicles;
