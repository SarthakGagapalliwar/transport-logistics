import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  TruckIcon,
  Car,
  Route,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  User,
  X,
  Box,
  Beaker,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const menuItems = [
    ...(user?.role === "admin"
      ? [
          {
            icon: <Home className="w-5 h-5" />,
            label: "Dashboard",
            path: "/dashboard",
          },
          {
            icon: <TruckIcon className="w-5 h-5" />,
            label: "Transporters",
            path: "/transporters",
          },
          {
            icon: <Car className="w-5 h-5" />,
            label: "Vehicles",
            path: "/vehicles",
          },
          {
            icon: <Box className="w-5 h-5" />,
            label: "Packages",
            path: "/packages",
          },
          {
            icon: <Beaker className="w-5 h-5" />,
            label: "Materials",
            path: "/materials",
          },
          {
            icon: <Route className="w-5 h-5" />,
            label: "Routes",
            path: "/routes",
          },
        ]
      : []),
    {
      icon: <Package className="w-5 h-5" />,
      label: "Shipments",
      path: "/shipments",
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      label: "Reports",
      path: "/reports",
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: "Settings",
      path: "/settings",
    },
    ...(user?.role === "admin"
      ? [
          {
            icon: <User className="w-5 h-5" />,
            label: "User Management",
            path: "/users",
          },
        ]
      : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const isHomePage = location.pathname === "/";

  if (isHomePage && !user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex md:flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold">Transport</h1>
          {user && (
            <p className="text-sm text-gray-500">Welcome,{user.username}</p>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive(item.path)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="flex w-full items-center gap-3 text-gray-700 hover:bg-red-50 hover:text-red-600"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full mr-2"></span>
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">Trasport</h1>
          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="font-bold text-xl">Menu</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileNavOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {user && (
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm text-gray-500">
                      Welcome, {user.username}
                    </p>
                  </div>
                )}

                <nav className="flex-1 overflow-y-auto p-4">
                  <ul className="space-y-2">
                    {menuItems.map((item) => (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setIsMobileNavOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                            isActive(item.path)
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="p-4 border-t border-gray-200">
                  <Button
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      handleLogout();
                    }}
                    variant="ghost"
                    className="flex w-full items-center gap-3 text-gray-700 hover:bg-red-50 hover:text-red-600"
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full mr-2"></span>
                        <span>Logging out...</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pt-0 md:pt-0">
        <div className="md:hidden h-16"></div>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
