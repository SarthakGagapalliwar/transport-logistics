import React, { useState } from "react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Edit,
  User,
  Phone,
  MapPin,
  Building,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useTransportersQuery,
  useAddTransporter,
  useUpdateTransporter,
  useToggleTransporterActive,
} from "@/hooks/use-transporters";
import { useAuth } from "@/context/AuthContext";
import { Column } from "@/types/data-table";
import { Switch } from "@/components/ui/switch";
import type { Transporter } from "@/integrations/supabase/types";

interface TransporterFormData {
  name: string;
  gstn: string;
  contactPerson: string;
  contactNumber: string;
  address: string;
}

const initialFormData: TransporterFormData = {
  name: "",
  gstn: "",
  contactPerson: "",
  contactNumber: "",
  address: "",
};

const Transporters = () => {
  const { data: transporters = [], isLoading, error } = useTransportersQuery();
  const addMutation = useAddTransporter();
  const updateMutation = useUpdateTransporter();
  const toggleMutation = useToggleTransporterActive();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTransporter, setSelectedTransporter] =
    useState<Transporter | null>(null);
  const [formData, setFormData] =
    useState<TransporterFormData>(initialFormData);

  const isSubmitting = addMutation.isPending || updateMutation.isPending;
  const isToggling = toggleMutation.isPending;

  const isMobile = useIsMobile();
  const { user } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTransporter = () => {
    setSelectedTransporter(null);
    setFormData(initialFormData);
    setOpenDialog(true);
  };

  const handleEditTransporter = (transporter: Transporter) => {
    setSelectedTransporter(transporter);
    setFormData({
      name: transporter.name,
      gstn: transporter.gstn || "",
      contactPerson: transporter.contactPerson || "",
      contactNumber: transporter.contactNumber || "",
      address: transporter.address || "",
    });
    setOpenDialog(true);
  };

  const handleToggleActive = (transporter: Transporter, active: boolean) => {
    toggleMutation.mutate({ id: transporter.id, active });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTransporter) {
      updateMutation.mutate(
        { id: selectedTransporter.id, ...formData },
        { onSuccess: () => setOpenDialog(false) }
      );
    } else {
      addMutation.mutate(formData, { onSuccess: () => setOpenDialog(false) });
    }
  };

  const columns: Column[] = [
    {
      header: "Name",
      accessorKey: "name",
    },
    {
      header: "GST Number",
      accessorKey: "gstn",
    },
    {
      header: "Contact Person",
      accessorKey: "contactPerson",
    },
    {
      header: "Phone",
      accessorKey: "contactNumber",
    },
  ];

  if (user?.role === "admin") {
    columns.push({
      header: "Status",
      accessorKey: "active",
      cell: (row: any) => (
        <Switch
          checked={row.active}
          onCheckedChange={(checked) => {
            handleToggleActive(row, checked);
          }}
          disabled={isToggling}
          aria-label="Toggle active status"
        />
      ),
    });
    columns.push({
      header: "Actions",
      accessorKey: "actions",
      cell: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleEditTransporter(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  const mobileColumns = isMobile
    ? columns.filter((col) => {
        if (typeof col.header === "string") {
          return [
            "Name",
            "GST Number",
            "Contact Person",
            "Phone",
            "Status",
            "Actions",
          ].includes(col.header);
        }
        return false;
      })
    : columns;

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>Transporters | Transporters</title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Transporters
              </h1>
              <p className="text-muted-foreground">
                Manage transport companies and their details
              </p>
            </div>
            {user?.role === "admin" ? (
              <Button onClick={handleAddTransporter}>
                <Plus className="mr-2 h-4 w-4" /> Add Transporter
              </Button>
            ) : (
              <div></div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transporters List</CardTitle>
              <CardDescription>
                View and manage all registered transporters
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <p className="text-sm font-medium text-destructive">
                    Failed to load transporters.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(error as Error).message || "Please try again."}
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <DataTable
                  data={transporters}
                  columns={mobileColumns}
                  searchKey="name"
                  searchPlaceholder="Search transporters..."
                />
              )}
            </CardContent>
          </Card>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedTransporter
                    ? "Edit Transporter"
                    : "Add New Transporter"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for the transport company
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="name"
                        name="name"
                        placeholder="Enter company name"
                        className="pl-10"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gstn">GST Number</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="gstn"
                        name="gstn"
                        placeholder="Enter GST number"
                        className="pl-10"
                        value={formData.gstn}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="contactPerson"
                        name="contactPerson"
                        placeholder="Enter contact person"
                        className="pl-10"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="contactNumber"
                        name="contactNumber"
                        placeholder="Enter contact number"
                        className="pl-10"
                        value={formData.contactNumber}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                    <Input
                      id="address"
                      name="address"
                      placeholder="Enter company address"
                      className="pl-10"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
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
                        {selectedTransporter ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{selectedTransporter ? "Update" : "Add"} Transporter</>
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

export default Transporters;
