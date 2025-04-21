import { RevenueData, ShipmentStatusCount, WeeklyShipmentCount, DashboardStats } from '@/types/analytics';
import { supabase } from '@/lib/supabase';

// Create sample monthly data for visualization when there's no real data
export const createSampleMonthlyData = (): { 
  revenueData: RevenueData[];
  currentMonthRevenue: number;
  previousMonthRevenue: number;
} => {
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIndex = now.getMonth();
  const currentMonth = monthNames[currentMonthIndex];
  const previousMonth = monthNames[(currentMonthIndex - 1 + 12) % 12];
  
  const monthlyData: Record<string, RevenueData> = {};
  let currentMonthRevenue = 0;
  let previousMonthRevenue = 0;
  
  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonthIndex - i + 12) % 12;
    const month = monthNames[monthIndex];
    
    // Random but realistic-looking data
    const revenue = Math.floor(Math.random() * 200000) + 100000;
    const cost = Math.floor(revenue * (Math.random() * 0.3 + 0.5)); // 50-80% of revenue
    const profit = revenue - cost;
    
    monthlyData[month] = {
      month,
      revenue,
      cost,
      profit
    };
    
    // Set the current month and previous month revenue for dashboard stats
    if (month === currentMonth) {
      currentMonthRevenue = revenue;
    } else if (month === previousMonth) {
      previousMonthRevenue = revenue;
    }
  }
  
  // Convert monthly data to array and sort by month
  const monthNames2 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueData = Object.values(monthlyData).sort((a, b) => 
    monthNames2.indexOf(a.month) - monthNames2.indexOf(b.month)
  );
  
  return { revenueData, currentMonthRevenue, previousMonthRevenue };
};

// Process shipment and route data to calculate revenue, costs, and profits
export const processFinancialData = (
  shipments: any[],
  routesMap: Record<string, any>
): {
  revenueData: RevenueData[];
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  currentMonthShipments: number;
  previousMonthShipments: number;
} => {
  const monthlyData: Record<string, RevenueData> = {};
  const now = new Date();
  const currentMonth = now.toLocaleString('default', { month: 'short' });
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    .toLocaleString('default', { month: 'short' });
  
  let currentMonthRevenue = 0;
  let previousMonthRevenue = 0;
  let currentMonthShipments = 0;
  let previousMonthShipments = 0;
  
  // Create a map for quick source-destination lookup
  const routesBySourceDest: Record<string, any> = {};
  Object.values(routesMap).forEach(route => {
    const key = `${route.source}|${route.destination}`.toLowerCase();
    routesBySourceDest[key] = route;
  });
  
  // Create a set to keep track of months we've seen
  const seenMonths = new Set<string>();
  
  shipments.forEach((shipment) => {
    let routeInfo = null;
    
    // Try to find route by route_id first
    if (shipment.route_id && routesMap[shipment.route_id]) {
      routeInfo = routesMap[shipment.route_id];
    } 
    // If route_id is missing or invalid, try to match by source and destination
    else if (shipment.source && shipment.destination) {
      const lookupKey = `${shipment.source}|${shipment.destination}`.toLowerCase();
      routeInfo = routesBySourceDest[lookupKey];
      
      if (!routeInfo) {
        console.log(`No route found for ${shipment.source} to ${shipment.destination}`);
      }
    }
    
    // Skip if we can't find route information
    if (!routeInfo) {
      console.log(`Shipment ${shipment.id} missing route data, trying to find by source/destination`);
      return;
    }
    
    // Use quantities and rates to calculate financials
    const quantity = parseFloat(shipment.quantity_tons) || 0;
    const billingRate = parseFloat(routeInfo.billing_rate_per_ton) || 0;
    const vendorRate = parseFloat(routeInfo.vendor_rate_per_ton) || 0;
    
    // Calculate financial metrics
    const revenue = parseFloat((quantity * billingRate).toFixed(2));
    const cost = parseFloat((quantity * vendorRate).toFixed(2));
    const profit = parseFloat((revenue - cost).toFixed(2));
    
    // Get the month from the shipment's departure_time instead of created_at
    // as it represents when the service was actually rendered
    let dateToUse = shipment.departure_time ? new Date(shipment.departure_time) : new Date(shipment.created_at);
    
    // If arrival_time exists and it's a completed shipment, use that instead
    if (shipment.arrival_time && 
        (shipment.status.toLowerCase() === 'completed' || shipment.status.toLowerCase() === 'delivered')) {
      dateToUse = new Date(shipment.arrival_time);
    }
    
    const month = dateToUse.toLocaleString('default', { month: 'short' });
    
    // For trend calculations
    const shipmentMonth = dateToUse.toLocaleString('default', { month: 'short' });
    if (shipmentMonth === currentMonth) {
      currentMonthRevenue += revenue;
      currentMonthShipments++;
    } else if (shipmentMonth === previousMonth) {
      previousMonthRevenue += revenue;
      previousMonthShipments++;
    }
    
    // Add month to seen months
    seenMonths.add(month);
    
    // Initialize or update the month data
    if (!monthlyData[month]) {
      monthlyData[month] = {
        month,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }
    
    monthlyData[month].revenue += revenue;
    monthlyData[month].cost += cost;
    monthlyData[month].profit += profit;
  });
  
  // Fill in any missing months in the last 6 months to ensure consistent display
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIndex = now.getMonth();
  
  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonthIndex - i + 12) % 12;
    const month = monthNames[monthIndex];
    
    if (!monthlyData[month] && !seenMonths.has(month)) {
      monthlyData[month] = {
        month,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }
  }
  
  // Convert monthly data to array and sort by month in chronological order
  const revenueData = Object.values(monthlyData).sort((a, b) => {
    const aIndex = monthNames.indexOf(a.month);
    const bIndex = monthNames.indexOf(b.month);
    
    // Adjust for year boundary (Dec to Jan)
    const adjustedAIndex = aIndex <= currentMonthIndex ? aIndex : aIndex - 12;
    const adjustedBIndex = bIndex <= currentMonthIndex ? bIndex : bIndex - 12;
    
    return adjustedAIndex - adjustedBIndex;
  });
  
  return {
    revenueData,
    currentMonthRevenue,
    previousMonthRevenue,
    currentMonthShipments,
    previousMonthShipments
  };
};

// Process shipments to get status counts
export const processShipmentStatusData = (shipments: any[]): ShipmentStatusCount[] => {
  const statusCounts: Record<string, number> = {
    'Completed': 0,
    'In Transit': 0,
    'Pending': 0,
    'Cancelled': 0
  };
  
  shipments.forEach((shipment) => {
    // Normalize status to proper casing format
    let status: string;
    
    switch(shipment.status.toLowerCase()) {
      case 'completed':
        status = 'Completed';
        break;
      case 'in transit':
      case 'in_transit':
        status = 'In Transit';
        break;
      case 'pending':
        status = 'Pending';
        break;
      case 'cancelled':
        status = 'Cancelled';
        break;
      default:
        status = shipment.status.charAt(0).toUpperCase() + shipment.status.slice(1).toLowerCase();
    }
    
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++;
    }
  });
  
  return Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      status,
      count,
    }));
};

// Process shipments to get weekly counts
export const processWeeklyShipmentData = (shipments: any[]): WeeklyShipmentCount[] => {
  const weeklyShipments: Record<string, number> = {
    'W1': 0, 'W2': 0, 'W3': 0, 'W4': 0, 'W5': 0
  };
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth();
  
  shipments.forEach((shipment) => {
    const date = new Date(shipment.created_at);
    const shipmentYear = date.getFullYear();
    const shipmentMonth = date.getMonth();
    
    // Only include shipments from the current month
    if (shipmentYear === currentYear && shipmentMonth === currentMonthNum) {
      const day = date.getDate();
      const weekNum = Math.ceil(day / 7);
      const weekKey = `W${weekNum}`;
      
      if (weeklyShipments[weekKey] !== undefined) {
        weeklyShipments[weekKey]++;
      }
    }
  });
  
  return Object.entries(weeklyShipments)
    .map(([week, count]) => ({
      week,
      count,
    }));
};

// Calculate the dashboard stats
export const calculateDashboardStats = (
  shipments: any[],
  currentMonthRevenue: number,
  previousMonthRevenue: number,
  currentMonthShipments: number,
  previousMonthShipments: number,
  transportersCount: number,
  vehiclesCount: number
): DashboardStats => {
  // Calculate revenue trend (percentage change)
  const revenueTrend = previousMonthRevenue > 0 
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : 0;
  
  // Calculate shipment trend (percentage change)
  const shipmentTrend = previousMonthShipments > 0
    ? ((currentMonthShipments - previousMonthShipments) / previousMonthShipments) * 100
    : 0;
  
  // Calculate active shipments (in_transit status)
  const activeShipments = shipments.filter(s => 
    s.status.toLowerCase() === 'in transit' || s.status.toLowerCase() === 'in_transit'
  ).length;
  
  return {
    activeShipments,
    totalVehicles: vehiclesCount || 0,
    totalTransporters: transportersCount || 0,
    revenueThisMonth: currentMonthRevenue,
    shipmentTrend,
    revenueTrend,
  };
};

// Fetch all the data needed for analytics
export const fetchAnalyticsData = async () => {
  
  try {
    // First get all the routes to have rate information
    const { data: routes, error: routesError } = await supabase
      .from('routes')
      .select('*');
    
    if (routesError) {
      console.error('Error fetching routes:', routesError);
      throw routesError;
    }
    
    // Create a map for quick lookup
    const routesMap: Record<string, any> = {};
    routes?.forEach(route => {
      routesMap[route.id] = {
        billing_rate_per_ton: route.billing_rate_per_ton,
        vendor_rate_per_ton: route.vendor_rate_per_ton,
        source: route.source,
        destination: route.destination
      };
    });
    
    // Get all shipments 
    const { data: shipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select('*');
    
    if (shipmentsError) {
      console.error('Error fetching shipments:', shipmentsError);
      throw shipmentsError;
    }
    
    // Get count of transporters
    const { count: transportersCount, error: transportersError } = await supabase
      .from('transporters')
      .select('*', { count: 'exact', head: true });
    
    if (transportersError) {
      console.error('Error fetching transporters count:', transportersError);
      throw transportersError;
    }
    
    // Get count of vehicles
    const { count: vehiclesCount, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });
    
    if (vehiclesError) {
      console.error('Error fetching vehicles count:', vehiclesError);
      throw vehiclesError;
    }
    
    // Process the data or use sample data if needed
    let revenueData: RevenueData[] = [];
    let currentMonthRevenue = 0;
    let previousMonthRevenue = 0;
    let currentMonthShipments = 0;
    let previousMonthShipments = 0;
    
    // Check if we have both routes and shipments
    const hasValidData = shipments?.length && Object.keys(routesMap).length;
    
    if (!hasValidData) {
      const sampleData = createSampleMonthlyData();
      revenueData = sampleData.revenueData;
      currentMonthRevenue = sampleData.currentMonthRevenue;
      previousMonthRevenue = sampleData.previousMonthRevenue;
    } else {
      // Process actual shipment data
      const financialData = processFinancialData(shipments, routesMap);
      
      // If we still couldn't generate any revenue data, fall back to sample data
      if (financialData.revenueData.length === 0) {
        const sampleData = createSampleMonthlyData();
        revenueData = sampleData.revenueData;
        currentMonthRevenue = sampleData.currentMonthRevenue;
        previousMonthRevenue = sampleData.previousMonthRevenue;
      } else {
        revenueData = financialData.revenueData;
        currentMonthRevenue = financialData.currentMonthRevenue;
        previousMonthRevenue = financialData.previousMonthRevenue;
        currentMonthShipments = financialData.currentMonthShipments;
        previousMonthShipments = financialData.previousMonthShipments;
      }
    }
    
    // Process shipment status data
    const shipmentStatusData = processShipmentStatusData(shipments || []);
    
    // Process weekly shipment data
    const weeklyShipmentData = processWeeklyShipmentData(shipments || []);
    
    // Calculate dashboard stats
    const dashboardStats = calculateDashboardStats(
      shipments || [],
      currentMonthRevenue,
      previousMonthRevenue,
      currentMonthShipments,
      previousMonthShipments,
      transportersCount || 0,
      vehiclesCount || 0
    );
    
    return {
      revenueData,
      shipmentStatusData,
      weeklyShipmentData,
      dashboardStats,
    };
  } catch (err) {
    console.error('Error in analytics calculation:', err);
    throw err;
  }
};
