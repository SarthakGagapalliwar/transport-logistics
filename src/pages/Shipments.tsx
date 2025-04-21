import React, { useState } from "react";
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
  MapPin,
  Truck,
  Weight,
  Calendar,
  Package,
  Beaker,
} from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useShipments } from "@/hooks/use-shipments";
import { parseISO } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { Column } from "@/types/data-table";
import { formatCurrency } from "@/lib/data";

const Shipments = () => {
  const {
    shipments,
    isLoading,
    openDialog,
    setOpenDialog,
    selectedShipment,
    formData,
    setFormData,
    handleInputChange,
    handleSelectChange,
    handleEditShipment,
    handleAddShipment,
    handleSubmit,
    transporters,
    vehicles,
    routes,
    packages,
    materials,
    isSubmitting,
  } = useShipments();

  const isMobile = useIsMobile();
  const { user } = useAuth();

  const [weightErrors, setWeightErrors] = useState({
    grossWeight: "",
    tareWeight: "",
    netWeight: "",
  });

  const grossWeightNum = parseFloat(formData.grossWeight || "0") || 0;
  const tareWeightNum = parseFloat(formData.tareWeight || "0") || 0;
  const netWeightNum =
    grossWeightNum >= 0 && tareWeightNum >= 0
      ? parseFloat((grossWeightNum - tareWeightNum).toFixed(5))
      : 0;

  React.useEffect(() => {
    let errors: typeof weightErrors = {
      grossWeight: "",
      tareWeight: "",
      netWeight: "",
    };
    if (grossWeightNum < 0) {
      errors.grossWeight = "Gross Weight cannot be negative";
    }
    if (tareWeightNum < 0) {
      errors.tareWeight = "Tare Weight cannot be negative";
    }
    if (tareWeightNum > grossWeightNum) {
      errors.netWeight = "Tare Weight cannot exceed Gross Weight";
    }
    setWeightErrors(errors);
    setFormData((prev) => ({
      ...prev,
      quantityTons:
        grossWeightNum >= 0 && tareWeightNum >= 0 && tareWeightNum <= grossWeightNum
          ? netWeightNum.toFixed(5)
          : "",
    }));
  }, [formData.grossWeight, formData.tareWeight]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not arrived";
    try {
      const parts = dateString.split('T');
      if (parts.length !== 2) return dateString;
      
      const datePart = parts[0].split('-');
      if (datePart.length !== 3) return dateString;
      
      const timePart = parts[1].split('+')[0].split('.')[0];
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[parseInt(datePart[1]) - 1];
      const day = parseInt(datePart[2]);
      const year = datePart[0];
      
      return `${month} ${day}, ${year} ${timePart}`;
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return "Invalid date";
    }
  };
  
  const filteredRoutes =
  formData.packageId && formData.packageId !== "none"
  ? routes.filter((route) => route.assignedPackageId === formData.packageId)
  : routes;
  
  const allColumns: Column[] = [
    {
      header: "Package",
      accessorKey: "packageName",
      cell: (row: any) => {
        if (!row.packageId) return "None";
        const pkg = packages.find((p) => p.id === row.packageId);
        return pkg ? pkg.name : "Unknown";
      },
    },
    {
      header: "Source",
      accessorKey: "source",
    },
    {
      header: "Destination",
      accessorKey: "destination",
    },
    {
      header: "Transporter",
      accessorKey: "transporterName",
    },
    {
      header: "Vehicle",
      accessorKey: "vehicleNumber",
    },
    {
      header: "Gross Weight",
      accessorKey: "grossWeight",
      cell: (row: any) =>
        row.grossWeight !== undefined ? `${row.grossWeight} tons` : "N/A",
    },
    {
      header: "Tare Weight",
      accessorKey: "tareWeight",
      cell: (row: any) =>
        row.tareWeight !== undefined ? `${row.tareWeight} tons` : "N/A",
    },
    {
      header: "Quantity",
      accessorKey: "quantityTons",
      cell: (row: any) => `${row.quantityTons} tons`,
    },
    {
      header: "Material",
      accessorKey: "materialName",
      cell: (row: any) => {
        if (!row.materialId) return "None";
        const material = materials.find((m) => m.id === row.materialId);
        return material ? material.name : "Unknown";
      },
    },
    {
      header: "Departure",
      accessorKey: "departureTime",
      cell: (row: any) => formatDate(row.departureTime),
    },
  ];

  const columns = user?.role === 'admin' 
    ? allColumns 
    : allColumns.filter(col => 
        col.header !== "Billing Rate" && col.header !== "Vendor Rate"
      );

  if (user?.role === "admin") {
    columns.push({
      header: "Actions",
      accessorKey: "actions",
      cell: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleEditShipment(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  const mobileColumns = isMobile
    ? columns.filter((col) =>
        ["Source", "Destination", "Actions"].includes(col.header as string)
      )
    : columns;

  const searchableColumns = ["source", "destination", "transporterName", "packageName", "materialName"];

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>Shipments | Transport</title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
              <p className="text-muted-foreground">
                {user?.role === 'admin' 
                  ? "Manage and track all coal shipments" 
                  : "View and track your assigned shipments"}
              </p>
            </div>
            <Button onClick={handleAddShipment}>
              <Plus className="mr-2 h-4 w-4" /> Add Shipment
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Shipments List</CardTitle>
              <CardDescription>
                {user?.role === 'admin' 
                  ? "View and manage all coal shipments" 
                  : "View shipments assigned to you"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : shipments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {user?.role === 'admin' 
                      ? "No shipments found in the system." 
                      : "You don't have any shipments assigned to you."}
                  </p>
                </div>
              ) : (
                <DataTable
                  data={shipments}
                  columns={mobileColumns}
                  searchableColumns={searchableColumns}
                  searchPlaceholder="Search shipments by source, destination, transporter..."
                />
              )}
            </CardContent>
          </Card>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedShipment ? "Edit Shipment" : "Add New Shipment"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for the shipment
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={(e) => {
                if (
                  weightErrors.grossWeight ||
                  weightErrors.tareWeight ||
                  weightErrors.netWeight
                ) {
                  e.preventDefault();
                  return;
                }
                handleSubmit(e);
              }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="packageId">Assign to Package</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Select
                        value={formData.packageId}
                        onValueChange={(value) =>
                          handleSelectChange("packageId", value)
                        }
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {packages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecting a package will filter available routes
                    </p>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="materialId">Select Material</Label>
                    <div className="relative">
                      <Beaker className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Select
                        value={formData.materialId}
                        onValueChange={(value) =>
                          handleSelectChange("materialId", value)
                        }
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select a material" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {materials
                            .filter(m => m.status === 'available')
                            .map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name} ({material.unit})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="routeId">Route</Label>
                    <Select
                      value={formData.routeId}
                      onValueChange={(value) =>
                        handleSelectChange("routeId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a predefined route" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredRoutes.map((route) => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.source} to {route.destination}
                          </SelectItem>
                        ))}
                        {filteredRoutes.length === 0 &&
                          formData.packageId !== "none" && (
                            <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                              No routes found for this package
                            </div>
                          )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecting a route will auto-fill source and destination
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="source"
                        name="source"
                        readOnly
                        placeholder="Enter source location"
                        className="pl-10"
                        value={formData.source}
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
                        readOnly
                        placeholder="Enter destination location"
                        className="pl-10"
                        value={formData.destination}
                        required
                      />
                    </div>
                  </div>

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
                    <Label htmlFor="vehicleId">Vehicle</Label>
                    <Select
                      value={formData.vehicleId}
                      onValueChange={(value) =>
                        handleSelectChange("vehicleId", value)
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles
                          .filter(
                            (v) =>
                              !formData.transporterId ||
                              v.transporterId === formData.transporterId
                          )
                          .map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.vehicleNumber} ({vehicle.vehicleType})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="departureTime">Departure Time</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="departureTime"
                        name="departureTime"
                        type="datetime-local"
                        className="pl-10"
                        value={formData.departureTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grossWeight">Gross Weight (tons)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        <Weight className="h-4 w-4" />
                      </span>
                      <Input
                        id="grossWeight"
                        name="grossWeight"
                        type="number"
                        min="0"
                        step="0.00001"
                        className="pl-10"
                        placeholder="Enter gross weight"
                        value={formData.grossWeight ?? ""}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    {weightErrors.grossWeight && (
                      <p className="text-xs text-destructive">{weightErrors.grossWeight}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tareWeight">Tare Weight (tons)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        <Weight className="h-4 w-4" />
                      </span>
                      <Input
                        id="tareWeight"
                        name="tareWeight"
                        type="number"
                        min="0"
                        step="0.00001"
                        className="pl-10"
                        placeholder="Enter tare weight"
                        value={formData.tareWeight ?? ""}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    {weightErrors.tareWeight && (
                      <p className="text-xs text-destructive">{weightErrors.tareWeight}</p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="quantityTons">Quantity (Net Weight, tons)</Label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="quantityTons"
                        name="quantityTons"
                        type="number"
                        readOnly
                        min="0"
                        step="0.00001"
                        className="pl-10 bg-gray-100 cursor-not-allowed"
                        placeholder="Net (gross - tare)"
                        value={formData.quantityTons ?? ""}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Calculated as Gross Weight minus Tare Weight.
                      {weightErrors.netWeight && (
                        <span className="text-destructive ml-2">{weightErrors.netWeight}</span>
                      )}
                    </p>
                  </div>

                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                  <Textarea
                    id="remarks"
                    name="remarks"
                    placeholder="Enter any additional notes or remarks"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    rows={3}
                  />
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
                        {selectedShipment ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{selectedShipment ? "Update" : "Add"} Shipment</>
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

export default Shipments;
