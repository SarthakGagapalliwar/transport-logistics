import React from "react";
import PageTransition from "@/components/ui-custom/PageTransition";
import DashboardCard from "@/components/ui-custom/DashboardCard";
import { DataTable } from "@/components/ui-custom/DataTable";
import { useAuth } from "@/context/AuthContext";
import {
  Truck,
  Package,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/data";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useAnalytics } from "@/hooks/use-analytics";
import { Loader2 } from "lucide-react";
import { useShipments } from "@/hooks/use-shipments";
import { format } from 'date-fns';
import { Column } from "@/types/data-table";

const Dashboard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { revenueData, weeklyShipmentData, dashboardStats, isLoading: isAnalyticsLoading, error: analyticsError } = useAnalytics();
  const { shipments, isLoading: isShipmentsLoading } = useShipments();

  // Format date helper
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  // Responsive columns for shipment table
  const shipmentColumns: Column[] = [
    {
      header: "Transporter",
      accessorKey: "transporterName",
    },
    {
      header: "Route",
      accessorKey: "source",
      cell: (row: any) => `${row.source} → ${row.destination}`,
    },
    {
      header: "Quantity",
      accessorKey: "quantityTons",
      cell: (row: any) => `${row.quantityTons} tons`,
    },
    {
      header: "Billing Rate",
      accessorKey: "billingRatePerTon",
      cell: (row: any) => row.billingRatePerTon ? formatCurrency(row.billingRatePerTon) : "N/A",
    },
    {
      header: "Vendor Rate",
      accessorKey: "vendorRatePerTon",
      cell: (row: any) => row.vendorRatePerTon ? formatCurrency(row.vendorRatePerTon) : "N/A",
    },
    {
      header: "Departure",
      accessorKey: "departureTime",
      cell: (row: any) => formatDate(row.departureTime),
    },
  ];

  // For mobile, show fewer columns
  const mobileShipmentColumns = isMobile
    ? shipmentColumns.filter((col) => {
        if (typeof col.header === 'string') {
          return ["Transporter"].includes(col.header);
        }
        return false;
      })
    : shipmentColumns;

  // Get recent shipments (last 5)
  const recentShipments = [...shipments]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const fadeInUpVariants = {
    initial: { opacity: 0, y: 10 },
    animate: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.05 * index,
        duration: 0.3,
        ease: "easeOut",
      },
    }),
  };

  if (isAnalyticsLoading || isShipmentsLoading) {
    return (
      <DashboardLayout>
        <div className="container py-6 flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (analyticsError) {
    return (
      <DashboardLayout>
        <div className="container py-6 flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">Error loading dashboard data</p>
            <p className="text-muted-foreground">{(analyticsError as Error).message}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="container py-6 max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.username}! Here's an overview of your
              logistics operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Active Shipments"
              value={dashboardStats.activeShipments}
              icon={<Package size={24} />}
              description="Currently in transit"
              trend={{ value: dashboardStats.shipmentTrend, isPositive: dashboardStats.shipmentTrend >= 0 }}
            />

            <DashboardCard
              title="Total Vehicles"
              value={dashboardStats.totalVehicles}
              icon={<Truck size={24} />}
              description="All registered vehicles"
            />

            <DashboardCard
              title="Total Transporters"
              value={dashboardStats.totalTransporters}
              icon={<Truck size={24} />}
              description="Active transport companies"
            />

            <DashboardCard
              title="Monthly Revenue"
              value={formatCurrency(dashboardStats.revenueThisMonth)}
              icon={<TrendingUp size={24} />}
              description="Current month"
              trend={{ value: dashboardStats.revenueTrend, isPositive: dashboardStats.revenueTrend >= 0 }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              variants={fadeInUpVariants}
              initial="initial"
              animate="animate"
              custom={2}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs. Cost</CardTitle>
                  <CardDescription>Monthly financial overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {revenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={revenueData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="month" />
                          <YAxis
                            tickFormatter={(value) =>
                              `₹${(value / 1000).toFixed(0)}K`
                            }
                          />
                          <Tooltip
                            formatter={(value) => [
                              `₹${(value as number).toLocaleString()}`,
                              "",
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="cost"
                            name="Cost"
                            stroke="hsl(var(--secondary-foreground))"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            strokeDasharray="5 5"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex justify-center items-center h-full">
                        <p className="text-muted-foreground">No revenue data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              variants={fadeInUpVariants}
              initial="initial"
              animate="animate"
              custom={3}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Shipments</CardTitle>
                  <CardDescription>
                    Number of shipments per week this month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {weeklyShipmentData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={weeklyShipmentData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            name="Shipments"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex justify-center items-center h-full">
                        <p className="text-muted-foreground">No shipment data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <motion.div
              variants={fadeInUpVariants}
              initial="initial"
              animate="animate"
              custom={4}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Recent Shipments</CardTitle>
                  <CardDescription>Latest shipment activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={recentShipments}
                    columns={mobileShipmentColumns}
                    searchKey="transporterName"
                    searchPlaceholder="Search by transporter..."
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default Dashboard;
