import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Truck, 
  Route, 
  Package, 
  FileText, 
  Settings, 
  LogOut, 
  Menu,
  X,
  User,
  Users,
  Box,
  Car,
  Beaker,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, active, onClick }) => {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center space-x-3 px-3 py-2 rounded-md transition-all",
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
      onClick={onClick}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
};

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (!user) return null;

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/transporters', icon: <Truck size={20} />, label: 'Transporters' },
    { to: '/vehicles', icon: <Car size={20} />, label: 'Vehicles' },
    { to: '/packages', icon: <Box size={20} />, label: 'Packages' },
    { to: '/materials', icon: <Beaker size={20} />, label: 'Materials' },
    { to: '/routes', icon: <Route size={20} />, label: 'Routes' },
    { to: '/shipments', icon: <Package size={20} />, label: 'Shipments' },
    { to: '/reports', icon: <FileText size={20} />, label: 'Reports' },
    { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const adminItems = [
    { to: '/users', icon: <Users size={20} />, label: 'User Management' },
  ];

  const items = user.role === 'admin' 
    ? [...navItems, ...adminItems] 
    : navItems;

  return (
    <>
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 w-64 border-r bg-card z-30 transition-all duration-300 ease-in-out",
          "hidden lg:flex lg:flex-col",
          scrolled && "shadow-sm"
        )}
      >
        <div className="p-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Transport
          </h1>
        </div>
        
        <nav className="flex-1 space-y-1 px-4 py-2">
          {items.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
            />
          ))}
        </nav>
        
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                <User size={20} />
              </div>
              <div>
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={logout}
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <header 
        className={cn(
          "sticky top-0 z-30 flex h-16 items-center justify-between bg-background/95 px-4 backdrop-blur lg:hidden",
          scrolled && "border-b shadow-sm"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden"
        >
          <Menu size={24} />
        </Button>
        
        <h1 className="text-lg font-semibold">Transport</h1>
        
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <User size={20} />
        </div>
      </header>

      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-3/4 max-w-xs bg-card border-r transition-transform duration-300 ease-in-out lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-semibold">Menu</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobileMenu}
          >
            <X size={20} />
          </Button>
        </div>
        
        <div className="py-4">
          <nav className="space-y-1 px-3">
            {items.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={location.pathname === item.to}
                onClick={closeMobileMenu}
              />
            ))}
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center mb-4">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
              <User size={20} />
            </div>
            <div>
              <p className="font-medium">{user.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={() => {
              closeMobileMenu();
              logout();
            }}
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
