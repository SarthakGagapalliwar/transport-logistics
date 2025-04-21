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
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTransporters } from "@/hooks/use-transporters";
import { useAuth } from "@/context/AuthContext";
import { Column } from "@/types/data-table";

const Transporters = () => {
  const {
    transporters,
    isLoading,
    openDialog,
    setOpenDialog,
    selectedTransporter,
    formData,
    handleInputChange,
    handleEditTransporter,
    handleAddTransporter,
    handleSubmit,
    isSubmitting,
  } = useTransporters();

  const isMobile = useIsMobile();

  const { user } = useAuth();

  // Columns for the data table
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
        if (typeof col.header === 'string') {
          return ["Name", "Actions"].includes(col.header);
        }
        return false;
      })
    : columns;

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>Transporters | Coal Logistics Hub</title>
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
              {isLoading ? (
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
