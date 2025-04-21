
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Transporters from "./pages/Transporters";
import Vehicles from "./pages/Vehicles";
import RoutesPage from "./pages/Routes";
import Shipments from "./pages/Shipments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import Packages from "./pages/Packages";
import Materials from "./pages/Materials";
import InactivePage from "./pages/InactivePage";

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
          <Dashboard />
        </AdminRoute>
      } />
      <Route path="/transporters" element={
        <AdminRoute>
          <Transporters />
        </AdminRoute>
      } />
      <Route path="/vehicles" element={
        <AdminRoute>
          <Vehicles />
        </AdminRoute>
      } />
      <Route path="/packages" element={
        <AdminRoute>
          <Packages />
        </AdminRoute>
      } />
      <Route path="/materials" element={
        <AdminRoute>
          <Materials />
        </AdminRoute>
      } />
      <Route path="/routes" element={
        <AdminRoute>
          <RoutesPage />
        </AdminRoute>
      } />
      <Route path="/shipments" element={
        <ProtectedRoute>
          <Shipments />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <AdminRoute>
          <UserManagement />
        </AdminRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Initialize the query client outside of the component
const queryClient = new QueryClient();

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
