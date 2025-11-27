import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
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
import {
  Plus,
  Edit,
  Truck,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useVehiclesQuery,
  useAddVehicle,
  useUpdateVehicle,
  useToggleVehicleActive,
  useIsVehicleNumberDuplicate,
} from "@/hooks/use-vehicles";
import { useTransportersQuery } from "@/hooks/use-transporters";
import { useAuth } from "@/context/AuthContext";
import type { Vehicle, Transporter } from "@/integrations/supabase/types";

interface VehicleFormData {
  transporterId: string;
  vehicleNumber: string;
  vehicleType: string;
  customVehicleType: string;
  capacity: string;
  status: string;
}

const initialFormData: VehicleFormData = {
  transporterId: "",
  vehicleNumber: "",
  vehicleType: "Truck",
  customVehicleType: "",
  capacity: "",
  status: "Available",
};

const Vehicles = () => {
  const { data: vehicles = [], isLoading } = useVehiclesQuery();
  const { data: allTransporters = [] } = useTransportersQuery();
  const addMutation = useAddVehicle();
  const updateMutation = useUpdateVehicle();
  const toggleMutation = useToggleVehicleActive();
  const isVehicleNumberDuplicate = useIsVehicleNumberDuplicate();

  // Filter active transporters for forms
  const transporters = allTransporters.filter((t: Transporter) => t.active);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);

  const isSubmitting = addMutation.isPending || updateMutation.isPending;
  const isToggling = toggleMutation.isPending;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddVehicle = () => {
    setSelectedVehicle(null);
    setFormData(initialFormData);
    setOpenDialog(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      transporterId: vehicle.transporterId || "",
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType || "Truck",
      customVehicleType: "",
      capacity: vehicle.capacity?.toString() || "",
      status: vehicle.status || "Available",
    });
    setOpenDialog(true);
  };

  const handleToggleActive = (vehicle: Vehicle) => {
    toggleMutation.mutate({ id: vehicle.id, active: !vehicle.active });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicate vehicle numbers
    const isDuplicate = isVehicleNumberDuplicate(
      formData.vehicleNumber,
      selectedVehicle?.id
    );
    if (isDuplicate) {
      return; // The hook will show a toast error
    }

    const vehicleTypeValue =
      formData.vehicleType === "Other"
        ? formData.customVehicleType
        : formData.vehicleType;

    const payload = {
      transporterId: formData.transporterId,
      vehicleNumber: formData.vehicleNumber,
      vehicleType: vehicleTypeValue,
      capacity: parseFloat(formData.capacity),
      status: formData.status,
    };

    if (selectedVehicle) {
      updateMutation.mutate(
        { id: selectedVehicle.id, ...payload },
        { onSuccess: () => setOpenDialog(false) }
      );
    } else {
      addMutation.mutate(payload, { onSuccess: () => setOpenDialog(false) });
    }
  };

  const isMobile = useIsMobile();
  const { user } = useAuth();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return format(date, "MMM d, yyyy");
    } catch (error) {
      return "N/A";
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
      cell: (info: any) => `${info.capacity} tons`,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (info: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            info.status === "Available"
              ? "bg-green-100 text-green-800"
              : info.status === "In Transit"
              ? "bg-blue-100 text-blue-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {info.status}
        </span>
      ),
    },
    {
      header: "Last Maintenance",
      accessorKey: "lastMaintenance",
      cell: (info: any) => formatDate(info.lastMaintenance),
    },
  ];

  if (user?.role === "admin") {
    columns.push({
      header: "Actions",
      accessorKey: "actions",
      cell: (info: any) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleEditVehicle(info)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleToggleActive(info)}
            disabled={isToggling}
          >
            {info.active ? (
              <ToggleLeft className="h-4 w-4 text-green-500" />
            ) : (
              <ToggleRight className="h-4 w-4 text-red-500" />
            )}
          </Button>
        </div>
      ),
    });
  }

  const mobileColumns = isMobile
    ? columns.filter((col) =>
        ["Vehicle Number", "Transporter", "Type", "Status", "Actions"].includes(
          col.header
        )
      )
    : columns;

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>Vehicles | Transport</title>
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
                      <Label htmlFor="customVehicleType">
                        Custom Vehicle Type
                      </Label>
                      <Input
                        id="customVehicleType"
                        name="customVehicleType"
                        placeholder="Enter custom vehicle type"
                        value={formData.customVehicleType || ""}
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
