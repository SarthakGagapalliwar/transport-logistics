import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Download, CalendarIcon, ArrowUpDown } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAnalytics } from '@/hooks/use-analytics';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { utils, writeFile } from 'xlsx';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { DateRange } from 'react-day-picker';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Reports = () => {
  const { revenueData, shipmentStatusData, isLoading, error } = useAnalytics();
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [shipmentReports, setShipmentReports] = useState<any[]>([]);
  const [isLoadingShipments, setIsLoadingShipments] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const isAdmin = user?.role === 'admin';
  
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalCost = revenueData.reduce((sum, item) => sum + item.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  
  const totalShipments = shipmentStatusData.reduce((sum, item) => sum + item.count, 0);
  const completedShipments = shipmentStatusData.find(s => s.status === 'Completed')?.count || 0;
  const inTransitShipments = shipmentStatusData.find(s => s.status === 'In Transit')?.count || 0;

  const statusData = [
    { name: 'Completed', value: completedShipments },
    { name: 'In Transit', value: inTransitShipments },
    { name: 'Pending', value: totalShipments - completedShipments - inTransitShipments },
  ].filter(item => item.value > 0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9467BD'];

  React.useEffect(() => {
    if (user) {
      if (user.role !== 'admin') {
        fetchAllUserShipments();
      } else {
        fetchAllShipments();
      }
    }
  }, [user]);

  const fetchAllShipments = async () => {
    if (!isAdmin) return;
    
    setIsLoadingShipments(true);
    
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id,
          source,
          destination,
          quantity_tons,
          departure_time,
          gross_weight,
          tare_weight,
          transporters:transporter_id (name),
          vehicles:vehicle_id (vehicle_number),
          packages:package_id (name),
          routes:route_id (billing_rate_per_ton, vendor_rate_per_ton),
          materials:material_id (name, unit)
        `)
        .order('departure_time', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      const processedData = data?.map(shipment => {
        const billingRate = shipment.routes?.billing_rate_per_ton || 0;
        const vendorRate = shipment.routes?.vendor_rate_per_ton || 0;
        const quantity = parseFloat(shipment.quantity_tons) || 0;
        const grossWeight = parseFloat(shipment.gross_weight) || 0;
        const tareWeight = parseFloat(shipment.tare_weight) || 0;
        
        const billingAmount = billingRate * quantity;
        const vendorAmount = vendorRate * quantity;
        const profit = billingAmount - vendorAmount;
        
        return {
          ...shipment,
          gross_weight: grossWeight,
          tare_weight: tareWeight,
          billing_amount: billingAmount,
          vendor_amount: vendorAmount,
          profit: profit
        };
      });
      
      setShipmentReports(processedData || []);
    } catch (err) {
      console.error('Error fetching all shipment reports:', err);
      toast.error(`Failed to fetch shipment reports: ${(err as Error).message}`);
    } finally {
      setIsLoadingShipments(false);
    }
  };

  const fetchAllUserShipments = async () => {
    if (!user) return;
    
    setIsLoadingShipments(true);
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('assigned_packages')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        throw new Error(profileError.message);
      }
      
      if (!profileData?.assigned_packages || profileData.assigned_packages.length === 0) {
        setShipmentReports([]);
        setIsLoadingShipments(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          id,
          source,
          destination,
          quantity_tons,
          departure_time,
          gross_weight,
          tare_weight,
          transporters:transporter_id (name),
          vehicles:vehicle_id (vehicle_number),
          packages:package_id (name),
          materials:material_id (name, unit)
        `)
        .in('package_id', profileData.assigned_packages)
        .order('departure_time', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      const processedData = data?.map(shipment => {
        const grossWeight = parseFloat(shipment.gross_weight) || 0;
        const tareWeight = parseFloat(shipment.tare_weight) || 0;
        
        return {
          ...shipment,
          gross_weight: grossWeight,
          tare_weight: tareWeight
        };
      });
      
      setShipmentReports(processedData || []);
    } catch (err) {
      console.error('Error fetching user shipment reports:', err);
      toast.error(`Failed to fetch shipment reports: ${(err as Error).message}`);
    } finally {
      setIsLoadingShipments(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedShipments = () => {
    if (!sortField) return shipmentReports;
    
    return [...shipmentReports].sort((a, b) => {
      let valueA, valueB;
      
      if (sortField === 'transporters.name') {
        valueA = a.transporters?.name || '';
        valueB = b.transporters?.name || '';
      } else if (sortField === 'vehicles.vehicle_number') {
        valueA = a.vehicles?.vehicle_number || '';
        valueB = b.vehicles?.vehicle_number || '';
      } else if (sortField === 'packages.name') {
        valueA = a.packages?.name || '';
        valueB = b.packages?.name || '';
      } else if (sortField === 'materials.name') {
        valueA = a.materials?.name || '';
        valueB = b.materials?.name || '';
      } else {
        valueA = a[sortField] || '';
        valueB = b[sortField] || '';
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.toLowerCase().localeCompare(valueB.toLowerCase());
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      const comparison = valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const handleExportExcel = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    setIsExporting(true);
    
    try {
      let query = supabase
        .from('shipments')
        .select(`
          *,
          transporters:transporter_id (name),
          vehicles:vehicle_id (vehicle_number),
          routes:route_id (billing_rate_per_ton, vendor_rate_per_ton),
          packages:package_id (name),
          materials:material_id (name, unit, description)
        `)
        .gte('departure_time', dateRange.from.toISOString())
        .lte('departure_time', dateRange.to.toISOString());
        
      if (user && user.role !== 'admin') {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('assigned_packages')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          throw new Error(profileError.message);
        }
        
        if (profileData?.assigned_packages && profileData.assigned_packages.length > 0) {
          query = query.in('package_id', profileData.assigned_packages);
        } else {
          toast.warning('No assigned packages to export');
          setIsExporting(false);
          return;
        }
      }
      
      query = query.order('departure_time', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.length === 0) {
        toast.warning('No shipments found in the selected date range');
        setIsExporting(false);
        return;
      }
      
      const formattedData = data.map(shipment => {
        const grossWeight = parseFloat(shipment.gross_weight) || 0;
        const tareWeight = parseFloat(shipment.tare_weight) || 0;
        const netWeight = parseFloat(shipment.quantity_tons) || 0;
        
        const baseFields = {
          'Package': shipment.packages?.name || 'N/A',
          'Source': shipment.source,
          'Destination': shipment.destination,
          'Transporter': shipment.transporters?.name || 'Unknown',
          'Vehicle': shipment.vehicles?.vehicle_number || 'Unknown',
          'Material': shipment.materials?.name || 'N/A',
          'Material Unit': shipment.materials?.unit || 'N/A',
          'Material Description': shipment.materials?.description || 'N/A',
          'Gross Weight (Tons)': grossWeight.toFixed(2),
          'Tare Weight (Tons)': tareWeight.toFixed(2),
          'Net Weight (Tons)': netWeight.toFixed(2),
          'Departure Time': format(parseISO(shipment.departure_time), 'PPP p'),
          'Remarks': shipment.remarks || '',
        };
        
        if (isAdmin) {
          const billingRate = shipment.routes?.billing_rate_per_ton || 0;
          const vendorRate = shipment.routes?.vendor_rate_per_ton || 0;
          const quantity = parseFloat(shipment.quantity_tons) || 0;
          
          const billingAmount = billingRate * quantity;
          const vendorAmount = vendorRate * quantity;
          const profit = billingAmount - vendorAmount;
          
          return {
            'ID': shipment.id,
            ...baseFields,
            'Billing Rate (₹/Ton)': billingRate,
            'Vendor Rate (₹/Ton)': vendorRate,
            'Billing Amount (₹)': billingAmount.toFixed(2),
            'Vendor Amount (₹)': vendorAmount.toFixed(2),
            'Profit (₹)': profit.toFixed(2),
          };
        }
        
        return baseFields;
      });
      
      const worksheet = utils.json_to_sheet(formattedData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Shipments');
      
      const filename = `Shipments_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
      writeFile(workbook, filename);
      
      toast.success('Shipment report downloaded successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error(`Failed to export shipments: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const regularUserColumns = [
    {
      header: "ID",
      accessorKey: "id"
    },
    { 
      header: "Package",
      accessorKey: "packages.name",
      cell: (row: any) => row.packages?.name || 'N/A'
    },
    {
      header: "Source",
      accessorKey: "source"
    },
    {
      header: "Destination",
      accessorKey: "destination"
    },
    {
      header: "Material",
      accessorKey: "materials.name",
      cell: (row: any) => row.materials?.name || 'N/A'
    },
    {
      header: "Transport",
      accessorKey: "transporters.name",
      cell: (row: any) => row.transporters?.name || 'Unknown'
    },
    {
      header: "Vehicle",
      accessorKey: "vehicles.vehicle_number",
      cell: (row: any) => row.vehicles?.vehicle_number || 'Unknown'
    },
    {
      header: "Gross Weight (tons)",
      accessorKey: "gross_weight",
      cell: (row: any) => row.gross_weight !== undefined ? `${parseFloat(row.gross_weight).toFixed(2)} tons` : "N/A"
    },
    {
      header: "Tare Weight (tons)",
      accessorKey: "tare_weight",
      cell: (row: any) => row.tare_weight !== undefined ? `${parseFloat(row.tare_weight).toFixed(2)} tons` : "N/A"
    },
    {
      header: "Net Weight (tons)",
      accessorKey: "quantity_tons",
      cell: (row: any) => row.quantity_tons !== undefined ? `${parseFloat(row.quantity_tons).toFixed(2)} tons` : "N/A"
    },
    {
      header: "Departure Date",
      accessorKey: "departure_time",
      cell: (row: any) => format(parseISO(row.departure_time), 'PPP')
    }
  ];

  const adminColumns = [
    {
      header: "ID",
      accessorKey: "id",
    },
    { 
      header: "Package",
      accessorKey: "packages.name",
      cell: (row: any) => row.packages?.name || 'N/A'
    },
    {
      header: "Source",
      accessorKey: "source"
    },
    {
      header: "Destination",
      accessorKey: "destination"
    },
    {
      header: "Material",
      accessorKey: "materials.name",
      cell: (row: any) => row.materials?.name || 'N/A'
    },
    {
      header: "Material Unit",
      accessorKey: "materials.unit",
      cell: (row: any) => row.materials?.unit || 'N/A'
    },
    {
      header: "Transport",
      accessorKey: "transporters.name",
      cell: (row: any) => row.transporters?.name || 'Unknown'
    },
    {
      header: "Vehicle",
      accessorKey: "vehicles.vehicle_number",
      cell: (row: any) => row.vehicles?.vehicle_number || 'Unknown'
    },
    {
      header: "Gross Weight (tons)",
      accessorKey: "gross_weight",
      cell: (row: any) => row.gross_weight !== undefined ? `${parseFloat(row.gross_weight).toFixed(2)} tons` : "N/A"
    },
    {
      header: "Tare Weight (tons)",
      accessorKey: "tare_weight",
      cell: (row: any) => row.tare_weight !== undefined ? `${parseFloat(row.tare_weight).toFixed(2)} tons` : "N/A"
    },
    {
      header: "Net Weight (tons)",
      accessorKey: "quantity_tons",
      cell: (row: any) => row.quantity_tons !== undefined ? `${parseFloat(row.quantity_tons).toFixed(2)} tons` : "N/A"
    },
    {
      header: "Departure Date",
      accessorKey: "departure_time",
      cell: (row: any) => format(parseISO(row.departure_time), 'PPP')
    },
    {
      header: "Billing Rate (₹/Ton)",
      accessorKey: "routes.billing_rate_per_ton",
      cell: (row: any) => row.routes?.billing_rate_per_ton ? `₹${row.routes.billing_rate_per_ton}` : 'N/A'
    },
    {
      header: "Vendor Rate (₹/Ton)",
      accessorKey: "routes.vendor_rate_per_ton",
      cell: (row: any) => row.routes?.vendor_rate_per_ton ? `₹${row.routes.vendor_rate_per_ton}` : 'N/A'
    },
    {
      header: "Billing Amount (₹)",
      accessorKey: "billing_amount",
      cell: (row: any) => {
        const billingRate = row.routes?.billing_rate_per_ton || 0;
        const quantity = parseFloat(row.quantity_tons) || 0;
        const amount = billingRate * quantity;
        return `₹${amount.toFixed(2)}`;
      }
    },
    {
      header: "Vendor Amount (₹)",
      accessorKey: "vendor_amount",
      cell: (row: any) => {
        const vendorRate = row.routes?.vendor_rate_per_ton || 0;
        const quantity = parseFloat(row.quantity_tons) || 0;
        const amount = vendorRate * quantity;
        return `₹${amount.toFixed(2)}`;
      }
    },
    {
      header: "Profit (₹)",
      accessorKey: "profit",
      cell: (row: any) => {
        const billingRate = row.routes?.billing_rate_per_ton || 0;
        const vendorRate = row.routes?.vendor_rate_per_ton || 0;
        const quantity = parseFloat(row.quantity_tons) || 0;
        const profit = (billingRate - vendorRate) * quantity;
        return `₹${profit.toFixed(2)}`;
      }
    }
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading reports data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container py-6 flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">Error loading reports data</p>
            <p className="text-muted-foreground">{(error as Error).message}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const sortedShipments = getSortedShipments();
  const pageCount = Math.ceil(sortedShipments.length / pageSize);
  const pagedShipments = sortedShipments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          
          <div className="flex items-center gap-2">
            <div className="grid gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Select date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="pointer-events-auto p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <Button 
              onClick={handleExportExcel} 
              disabled={isExporting || (!dateRange?.from || !dateRange?.to)}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export Excel
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>
                {isAdmin ? 'Shipment Reports' : 'My Shipment Reports'}
              </CardTitle>
              <CardDescription>
                {isAdmin 
                  ? 'All shipments in the system'
                  : 'All shipments assigned to you'
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingShipments ? (
              <div className="h-60 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin ? (
                        adminColumns.map((column, index) => (
                          <TableHead 
                            key={index}
                            className={column.accessorKey ? "cursor-pointer hover:bg-muted/50" : ""}
                            onClick={() => column.accessorKey ? handleSort(column.accessorKey) : null}
                          >
                            {column.header}
                            {column.accessorKey && <ArrowUpDown className="ml-2 h-4 w-4 inline-block" />}
                          </TableHead>
                        ))
                      ) : (
                        regularUserColumns.map((column, index) => (
                          <TableHead 
                            key={index}
                            className={column.accessorKey ? "cursor-pointer hover:bg-muted/50" : ""}
                            onClick={() => column.accessorKey ? handleSort(column.accessorKey) : null}
                          >
                            {column.header}
                            {column.accessorKey && <ArrowUpDown className="ml-2 h-4 w-4 inline-block" />}
                          </TableHead>
                        ))
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedShipments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? adminColumns.length : regularUserColumns.length} className="h-24 text-center">
                          {isAdmin
                            ? 'No shipments found in the system'
                            : 'No shipments have been assigned to you'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedShipments.map((shipment) => (
                        <TableRow key={shipment.id}>
                          <TableCell>{shipment.id}</TableCell>
                          <TableCell>{shipment.packages?.name || 'N/A'}</TableCell>
                          <TableCell>{shipment.source}</TableCell>
                          <TableCell>{shipment.destination}</TableCell>
                          <TableCell>{shipment.materials?.name || 'N/A'}</TableCell>
                          {isAdmin && (
                            <TableCell>{shipment.materials?.unit || 'N/A'}</TableCell>
                          )}
                          <TableCell>{shipment.transporters?.name || 'Unknown'}</TableCell>
                          <TableCell>{shipment.vehicles?.vehicle_number || 'Unknown'}</TableCell>
                          <TableCell>
                            {shipment.gross_weight !== undefined && shipment.gross_weight !== null 
                              ? `${parseFloat(shipment.gross_weight).toFixed(2)} tons` 
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {shipment.tare_weight !== undefined && shipment.tare_weight !== null 
                              ? `${parseFloat(shipment.tare_weight).toFixed(2)} tons` 
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {shipment.quantity_tons !== undefined && shipment.quantity_tons !== null 
                              ? `${parseFloat(shipment.quantity_tons).toFixed(2)} tons` 
                              : "N/A"}
                          </TableCell>
                          <TableCell>{format(parseISO(shipment.departure_time), 'PPP')}</TableCell>
                          
                          {isAdmin && (
                            <>
                              <TableCell>
                                {shipment.routes?.billing_rate_per_ton ? `₹${shipment.routes.billing_rate_per_ton}` : 'N/A'}
                              </TableCell>
                              <TableCell>
                                {shipment.routes?.vendor_rate_per_ton ? `₹${shipment.routes.vendor_rate_per_ton}` : 'N/A'}
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const billingRate = shipment.routes?.billing_rate_per_ton || 0;
                                  const quantity = parseFloat(shipment.quantity_tons) || 0;
                                  const amount = billingRate * quantity;
                                  return `₹${amount.toFixed(2)}`;
                                })()}
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const vendorRate = shipment.routes?.vendor_rate_per_ton || 0;
                                  const quantity = parseFloat(shipment.quantity_tons) || 0;
                                  const amount = vendorRate * quantity;
                                  return `₹${amount.toFixed(2)}`;
                                })()}
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const billingRate = shipment.routes?.billing_rate_per_ton || 0;
                                  const vendorRate = shipment.routes?.vendor_rate_per_ton || 0;
                                  const quantity = parseFloat(shipment.quantity_tons) || 0;
                                  const profit = (billingRate - vendorRate) * quantity;
                                  return `₹${profit.toFixed(2)}`;
                                })()}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <div className="flex justify-center items-center mt-6 gap-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {pageCount}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === pageCount || pageCount === 0}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
