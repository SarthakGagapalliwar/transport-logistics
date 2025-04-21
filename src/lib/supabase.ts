
import { createClient } from "@supabase/supabase-js";

// These environment variables are automatically injected by the Supabase integration
const supabaseUrl = "https://oeoklsspynwktggvrrcm.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lb2tsc3NweW53a3RnZ3ZycmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMzg5MjYsImV4cCI6MjA1NjkxNDkyNn0.dLYGPxN31HA4GFc-LNWfa_GmjgnJE32FCbNcr9xP3u8";

// Check if we're in development mode
const isDevelopment = import.meta.env.MODE === "development";

// Mock data storage for development
const mockStorage = {
  transporters: [],
  vehicles: [],
  routes: [],
  shipments: [],
  materials: [],
};

// Create a mock client for development if variables are missing
const createMockClient = () => {
  console.warn(
    "Using mock Supabase client. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for a real connection."
  );

  // Return a mock client with the same interface but no real operations
  return {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: null }, error: null }),
      signUp: ({ email, password }) =>
        Promise.resolve({
          data: { user: { id: "mock-user-id", email } },
          error: null,
        }),
      signInWithPassword: () =>
        Promise.resolve({
          data: { user: { id: "mock-user-id", email: "mock@example.com" } },
          error: null,
        }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: (callback) => {
        // Call callback once with a fake signed-in session
        callback("SIGNED_IN", {
          user: { id: "mock-user-id", email: "mock@example.com" },
        });
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: (table) => {
      // Create a chainable API for mock data operations
      const chainObj = {
        select: (columns = "*") => {
          console.log(`[MOCK] Selecting from ${table}`);

          const mockData = mockStorage[table] || [];
          console.log(
            `[MOCK] Returning ${mockData.length} items from ${table}`
          );

          return {
            eq: (column, value) => ({
              single: () => {
                const item = mockData.find((item) => item[column] === value);
                return Promise.resolve({
                  data: item || null,
                  error: item ? null : { message: "No data found" },
                });
              },
              data: mockData.filter((item) => item[column] === value),
              error: null,
            }),
            order: () => chainObj,
            data: mockData,
            error: null,
          };
        },
        insert: (data) => {
          console.log(`[MOCK] Inserting into ${table}:`, data);

          // Generate a mock ID if not provided
          const newItem = { 
            id: data.id || `mock-id-${Math.random().toString(36).substring(2, 10)}`,
            ...data,
            created_at: data.created_at || new Date().toISOString()
          };

          // Add to mock storage
          if (!mockStorage[table]) {
            mockStorage[table] = [];
          }
          mockStorage[table].push(newItem);

          console.log(
            `[MOCK] ${table} now has ${mockStorage[table].length} items`
          );

          // Add chainable select method to insert
          const insertObj = {
            select: () => Promise.resolve({
              data: newItem,
              error: null
            }),
            single: () => Promise.resolve({ 
              data: newItem, 
              error: null 
            }),
            data: newItem,
            error: null,
          };
          return insertObj;
        },
        update: (data) => {
          return {
            eq: (column, value) => {
              console.log(
                `[MOCK] Updating ${table} where ${column} = ${value}:`,
                data
              );

              if (mockStorage[table]) {
                const index = mockStorage[table].findIndex(
                  (item) => item[column] === value
                );
                if (index >= 0) {
                  mockStorage[table][index] = {
                    ...mockStorage[table][index],
                    ...data,
                    updated_at: new Date().toISOString(),
                  };
                  return Promise.resolve({ 
                    data: mockStorage[table][index], 
                    error: null 
                  });
                }
              }
              
              return Promise.resolve({ 
                data: null, 
                error: null 
              });
            },
            data: null,
            error: null,
          };
        },
        delete: () => {
          return {
            eq: (column, value) => {
              console.log(
                `[MOCK] Deleting from ${table} where ${column} = ${value}`
              );

              if (mockStorage[table]) {
                const initialLength = mockStorage[table].length;
                const deletedItem = mockStorage[table].find(item => item[column] === value);
                mockStorage[table] = mockStorage[table].filter(item => item[column] !== value);
                console.log(`[MOCK] Deleted ${initialLength - mockStorage[table].length} items`);
                
                return Promise.resolve({ 
                  data: deletedItem || null, 
                  error: null 
                });
              }

              return Promise.resolve({ data: null, error: null });
            },
            data: null,
            error: null,
          };
        },
        eq: () => Promise.resolve({ data: [], error: null }),
      };

      return chainObj;
    },
    rpc: () => Promise.resolve({ data: [], error: null }),
  };
};

// Initialize the Supabase client
export const supabase =
  (!supabaseUrl || !supabaseAnonKey) && isDevelopment
    ? (createMockClient() as any)
    : createClient(supabaseUrl || "", supabaseAnonKey || "");

// Helper function to handle Supabase errors consistently
export const handleSupabaseError = (error: Error | null) => {
  if (error) {
    console.error("Supabase error:", error);
    return error.message;
  }
  return null;
};

// Define types for our database tables
export type DbTransporter = {
  id: string;
  name: string;
  gstn: string;
  contact_person: string;
  contact_number: string;
  address: string;
  created_at: string;
};

export type DbVehicle = {
  id: string;
  transporter_id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: number;
  status: string;
  last_maintenance: string;
  created_at: string;
};

export type DbRoute = {
  id: string;
  source: string;
  destination: string;
  distance_km: number;
  billing_rate_per_ton: number;
  vendor_rate_per_ton: number;
  estimated_time: number;
  created_at: string;
  assigned_package_id?: string;
};

export type DbShipment = {
  id: string;
  transporter_id: string;
  vehicle_id: string;
  source: string;
  destination: string;
  quantity_tons: number;
  status: string;
  departure_time: string;
  arrival_time: string | null;
  remarks?: string;
  created_at: string;
  route_id?: string;
  package_id?: string;
  material_id?: string;
  gross_weight?: number;  // Added this property
  tare_weight?: number;   // Added this property
};

export type DbMaterial = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  status: string;
  created_at: string;
  updated_at: string;
};
