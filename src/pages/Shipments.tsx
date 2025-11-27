import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Weight,
  Calendar,
  Package,
  Beaker,
  Trash2,
} from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import { Column } from "@/types/data-table";
import {
  useShipmentsQuery,
  useUserProfileQuery,
  useAddShipment,
  useUpdateShipment,
  useDeleteShipment,
  Shipment,
  ShipmentInput,
} from "@/hooks/use-shipments";
import { useTransportersQuery } from "@/hooks/use-transporters";
import { useVehiclesQuery } from "@/hooks/use-vehicles";
import { useRoutesQuery } from "@/hooks/use-routes";
import { usePackagesQuery } from "@/hooks/use-packages";
import { useMaterialsQuery } from "@/hooks/use-materials";

// ============================================================================
// Types
// ============================================================================

interface ShipmentFormData {
  transporterId: string;
  vehicleId: string;
  source: string;
  destination: string;
  grossWeight: string;
  tareWeight: string;
  quantityTons: string;
  status: string;
  departureTime: string;
  arrivalTime: string;
  remarks: string;
  routeId: string;
  packageId: string;
  materialId: string;
}

interface WeightErrors {
  grossWeight: string;
  tareWeight: string;
  netWeight: string;
}

const INITIAL_FORM_DATA: ShipmentFormData = {
  transporterId: "",
  vehicleId: "",
  source: "",
  destination: "",
  grossWeight: "",
  tareWeight: "",
  quantityTons: "",
  status: "Pending",
  departureTime: "",
  arrivalTime: "",
  remarks: "",
  routeId: "",
  packageId: "none",
  materialId: "none",
};

// ============================================================================
// Helpers
// ============================================================================

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "Not arrived";
  try {
    const parts = dateString.split("T");
    if (parts.length !== 2) return dateString;

    const datePart = parts[0].split("-");
    if (datePart.length !== 3) return dateString;

    const timePart = parts[1].split("+")[0].split(".")[0];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[parseInt(datePart[1]) - 1];
    const day = parseInt(datePart[2]);
    const year = datePart[0];

    return `${month} ${day}, ${year} ${timePart}`;
  } catch {
    return "Invalid date";
  }
};

const shipmentToFormData = (shipment: Shipment): ShipmentFormData => ({
  transporterId: shipment.transporterId,
  vehicleId: shipment.vehicleId,
  source: shipment.source,
  destination: shipment.destination,
  grossWeight: String(shipment.grossWeight || ""),
  tareWeight: String(shipment.tareWeight || ""),
  quantityTons: String(shipment.quantityTons || ""),
  status: shipment.status,
  departureTime: shipment.departureTime
    ? shipment.departureTime.slice(0, 16)
    : "",
  arrivalTime: shipment.arrivalTime ? shipment.arrivalTime.slice(0, 16) : "",
  remarks: shipment.remarks || "",
  routeId: shipment.routeId || "",
  packageId: shipment.packageId || "none",
  materialId: shipment.materialId || "none",
});

const formDataToInput = (form: ShipmentFormData): ShipmentInput => ({
  transporterId: form.transporterId,
  vehicleId: form.vehicleId,
  source: form.source,
  destination: form.destination,
  grossWeight: parseFloat(form.grossWeight) || 0,
  tareWeight: parseFloat(form.tareWeight) || 0,
  quantityTons: parseFloat(form.quantityTons) || 0,
  status: form.status || "Pending",
  departureTime: form.departureTime,
  arrivalTime: form.arrivalTime || null,
  remarks: form.remarks || undefined,
  routeId: form.routeId || undefined,
  packageId: form.packageId !== "none" ? form.packageId : undefined,
  materialId: form.materialId !== "none" ? form.materialId : undefined,
});

// ============================================================================
// Component
// ============================================================================

const Shipments: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = user?.role === "admin";

  // Data queries
  const { data: transporters = [] } = useTransportersQuery();
  const { data: vehicles = [] } = useVehiclesQuery();
  const { data: routes = [] } = useRoutesQuery();
  const { data: packages = [] } = usePackagesQuery();
  const { data: materials = [] } = useMaterialsQuery();

  const { data: userProfile } = useUserProfileQuery(
    user?.id,
    !!user && !isAdmin
  );
  const userPackages = userProfile?.assigned_packages ?? [];

  const { data: shipments = [], isLoading } = useShipmentsQuery(
    isAdmin,
    userPackages,
    !!user
  );

  // Mutations
  const addMutation = useAddShipment();
  const updateMutation = useUpdateShipment();
  const deleteMutation = useDeleteShipment();

  // Local state
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null
  );
  const [formData, setFormData] = useState<ShipmentFormData>(INITIAL_FORM_DATA);
  const [weightErrors, setWeightErrors] = useState<WeightErrors>({
    grossWeight: "",
    tareWeight: "",
    netWeight: "",
  });

  // Derived data
  const activePackages = useMemo(
    () => packages.filter((pkg) => pkg.active),
    [packages]
  );

  const activeTransporters = useMemo(
    () => transporters.filter((t) => t.active),
    [transporters]
  );

  const filteredRoutes = useMemo(() => {
    if (!formData.packageId || formData.packageId === "none") {
      return routes;
    }
    return routes.filter(
      (route) => route.assignedPackageId === formData.packageId
    );
  }, [routes, formData.packageId]);

  const availableVehicles = useMemo(() => {
    return vehicles.filter(
      (v) =>
        v.active &&
        (!formData.transporterId || v.transporterId === formData.transporterId)
    );
  }, [vehicles, formData.transporterId]);

  const activeMaterials = useMemo(
    () => materials.filter((m) => m.status === "available"),
    [materials]
  );

  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  // Weight calculation effect
  useEffect(() => {
    const grossWeightNum = parseFloat(formData.grossWeight) || 0;
    const tareWeightNum = parseFloat(formData.tareWeight) || 0;

    const errors: WeightErrors = {
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
    if (tareWeightNum > grossWeightNum && grossWeightNum > 0) {
      errors.netWeight = "Tare Weight cannot exceed Gross Weight";
    }

    setWeightErrors(errors);

    const isValid =
      grossWeightNum >= 0 &&
      tareWeightNum >= 0 &&
      tareWeightNum <= grossWeightNum;

    const netWeight = isValid
      ? (grossWeightNum - tareWeightNum).toFixed(5)
      : "";

    setFormData((prev) => ({
      ...prev,
      quantityTons: netWeight,
    }));
  }, [formData.grossWeight, formData.tareWeight]);

  // Route selection effect - auto-fill source/destination
  useEffect(() => {
    if (formData.routeId) {
      const selectedRoute = routes.find((r) => r.id === formData.routeId);
      if (selectedRoute) {
        setFormData((prev) => ({
          ...prev,
          source: selectedRoute.source,
          destination: selectedRoute.destination,
        }));
      }
    }
  }, [formData.routeId, routes]);

  // Handlers
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData((prev) => {
      const updates: Partial<ShipmentFormData> = { [name]: value };

      // Reset dependent fields
      if (name === "packageId") {
        updates.routeId = "";
        updates.source = "";
        updates.destination = "";
      }
      if (name === "transporterId") {
        updates.vehicleId = "";
      }

      return { ...prev, ...updates };
    });
  }, []);

  const handleAddShipment = useCallback(() => {
    setSelectedShipment(null);
    setFormData(INITIAL_FORM_DATA);
    setOpenDialog(true);
  }, []);

  const handleEditShipment = useCallback((shipment: Shipment) => {
    setSelectedShipment(shipment);
    setFormData(shipmentToFormData(shipment));
    setOpenDialog(true);
  }, []);

  const handleDeleteShipment = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (
        weightErrors.grossWeight ||
        weightErrors.tareWeight ||
        weightErrors.netWeight
      ) {
        return;
      }

      const input = formDataToInput(formData);

      if (selectedShipment) {
        updateMutation.mutate(
          { id: selectedShipment.id, ...input },
          {
            onSuccess: () => {
              setOpenDialog(false);
              setSelectedShipment(null);
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
    [formData, selectedShipment, weightErrors, addMutation, updateMutation]
  );

  // Table columns
  const columns = useMemo((): Column[] => {
    const baseColumns: Column[] = [
      {
        header: "Package",
        accessorKey: "packageName",
        cell: (row: Shipment) => {
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
        cell: (row: Shipment) =>
          row.grossWeight !== undefined ? `${row.grossWeight} tons` : "N/A",
      },
      {
        header: "Tare Weight",
        accessorKey: "tareWeight",
        cell: (row: Shipment) =>
          row.tareWeight !== undefined ? `${row.tareWeight} tons` : "N/A",
      },
      {
        header: "Quantity",
        accessorKey: "quantityTons",
        cell: (row: Shipment) => `${row.quantityTons} tons`,
      },
      {
        header: "Material",
        accessorKey: "materialName",
        cell: (row: Shipment) => {
          if (!row.materialId) return "None";
          const material = materials.find((m) => m.id === row.materialId);
          return material ? material.name : "Unknown";
        },
      },
      {
        header: "Departure",
        accessorKey: "departureTime",
        cell: (row: Shipment) => formatDate(row.departureTime),
      },
    ];

    if (isAdmin) {
      baseColumns.push({
        header: "Actions",
        accessorKey: "actions",
        cell: (row: Shipment) => (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleEditShipment(row)}
              aria-label="Edit shipment"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete the shipment from ${row.source} to ${row.destination}?`
                  )
                ) {
                  handleDeleteShipment(row.id);
                }
              }}
              aria-label="Delete shipment"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      });
    }

    return baseColumns;
  }, [isAdmin, packages, materials, handleEditShipment, handleDeleteShipment]);

  const displayColumns = useMemo(() => {
    if (!isMobile) return columns;
    const mobileHeaders = [
      "Package",
      "Source",
      "Destination",
      "Transporter",
      "Vehicle",
      "Gross Weight",
      "Tare Weight",
      "Quantity",
      "Material",
      "Departure",
      "Actions",
    ];
    return columns.filter((col) =>
      mobileHeaders.includes(col.header as string)
    );
  }, [columns, isMobile]);

  const searchableColumns: (keyof Shipment)[] = [
    "source",
    "destination",
    "transporterName",
    "packageName",
    "materialName",
  ];

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
                {isAdmin
                  ? "Manage and track all shipments"
                  : "View and track your assigned shipments"}
              </p>
            </div>
            {isAdmin && (
              <Button onClick={handleAddShipment}>
                <Plus className="mr-2 h-4 w-4" /> Add Shipment
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Shipments List</CardTitle>
              <CardDescription>
                {isAdmin
                  ? "View and manage all shipments"
                  : "View shipments assigned to you"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : shipments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {isAdmin
                      ? "No shipments found in the system."
                      : "You don't have any shipments assigned to you."}
                  </p>
                </div>
              ) : (
                <DataTable
                  data={shipments}
                  columns={displayColumns}
                  searchableColumns={searchableColumns}
                  searchPlaceholder="Search shipments by source, destination, transporter..."
                />
              )}
            </CardContent>
          </Card>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedShipment ? "Edit Shipment" : "Add New Shipment"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for the shipment
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Package Selection */}
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
                          {activePackages.map((pkg) => (
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

                  {/* Material Selection */}
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
                          {activeMaterials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name} ({material.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Route Selection */}
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

                  {/* Source */}
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="source"
                        name="source"
                        readOnly
                        placeholder="Select a route"
                        className="pl-10"
                        value={formData.source}
                        required
                      />
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="destination"
                        name="destination"
                        readOnly
                        placeholder="Select a route"
                        className="pl-10"
                        value={formData.destination}
                        required
                      />
                    </div>
                  </div>

                  {/* Transporter */}
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
                        {activeTransporters.map((transporter) => (
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

                  {/* Vehicle */}
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
                        {availableVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.vehicleNumber} ({vehicle.vehicleType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Departure Time */}
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

                  {/* Gross Weight */}
                  <div className="space-y-2">
                    <Label htmlFor="grossWeight">Gross Weight (tons)</Label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="grossWeight"
                        name="grossWeight"
                        type="number"
                        min="0"
                        step="0.00001"
                        className="pl-10"
                        placeholder="Enter gross weight"
                        value={formData.grossWeight}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    {weightErrors.grossWeight && (
                      <p className="text-xs text-destructive">
                        {weightErrors.grossWeight}
                      </p>
                    )}
                  </div>

                  {/* Tare Weight */}
                  <div className="space-y-2">
                    <Label htmlFor="tareWeight">Tare Weight (tons)</Label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="tareWeight"
                        name="tareWeight"
                        type="number"
                        min="0"
                        step="0.00001"
                        className="pl-10"
                        placeholder="Enter tare weight"
                        value={formData.tareWeight}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    {weightErrors.tareWeight && (
                      <p className="text-xs text-destructive">
                        {weightErrors.tareWeight}
                      </p>
                    )}
                  </div>

                  {/* Net Weight (calculated) */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="quantityTons">
                      Quantity (Net Weight, tons)
                    </Label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="quantityTons"
                        name="quantityTons"
                        type="number"
                        readOnly
                        className="pl-10 bg-muted cursor-not-allowed"
                        placeholder="Net (gross - tare)"
                        value={formData.quantityTons}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Calculated as Gross Weight minus Tare Weight.
                      {weightErrors.netWeight && (
                        <span className="text-destructive ml-2">
                          {weightErrors.netWeight}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                  <Textarea
                    id="remarks"
                    name="remarks"
                    placeholder="Enter any additional notes or remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
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
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !!weightErrors.grossWeight ||
                      !!weightErrors.tareWeight ||
                      !!weightErrors.netWeight
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
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
