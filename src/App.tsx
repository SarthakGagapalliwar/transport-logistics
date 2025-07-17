
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
// Lazy load components for better performance
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import NotFound from "./pages/NotFound";
import InactivePage from "./pages/InactivePage";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transporters = lazy(() => import("./pages/Transporters"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const RoutesPage = lazy(() => import("./pages/Routes"));
const Shipments = lazy(() => import("./pages/Shipments"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Packages = lazy(() => import("./pages/Packages"));
const Materials = lazy(() => import("./pages/Materials"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  
  if (user && user.active === false) {
    return <Navigate to="/inactive" replace />;
  }
  
  return <>{children}</>;
};

// Admin-only route component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/shipments" replace />;
  }
  
  if (user && user.active === false) {
    return <Navigate to="/inactive" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/inactive" element={<InactivePage />} />

      <Route path="/dashboard" element={
        <AdminRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Dashboard />
          </Suspense>
        </AdminRoute>
      } />
      <Route path="/transporters" element={
        <AdminRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Transporters />
          </Suspense>
        </AdminRoute>
      } />
      <Route path="/vehicles" element={
        <AdminRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Vehicles />
          </Suspense>
        </AdminRoute>
      } />
      <Route path="/packages" element={
        <AdminRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Packages />
          </Suspense>
        </AdminRoute>
      } />
      <Route path="/materials" element={
        <AdminRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Materials />
          </Suspense>
        </AdminRoute>
      } />
      <Route path="/routes" element={
        <AdminRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <RoutesPage />
          </Suspense>
        </AdminRoute>
      } />
      <Route path="/shipments" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Shipments />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Reports />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Settings />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <AdminRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <UserManagement />
          </Suspense>
        </AdminRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Initialize the query client outside of the component with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Main App component
const App = () => {
  return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
  );
};

export default App;
