
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';

const NotFound = () => {
  return (
    <DashboardLayout>
      <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12">
        <h1 className="text-9xl font-extrabold tracking-widest text-primary">404</h1>
        <div className="bg-secondary px-2 text-sm rounded rotate-12 absolute">
          Page Not Found
        </div>
        <div className="mt-8 text-center space-y-4">
          <p className="text-xl text-muted-foreground">
            Oops! The page you are looking for does not exist.
          </p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NotFound;
