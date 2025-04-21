
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Truck, BarChart3, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const Index = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header / Nav */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Transport</h1>
        </div>
        <div>
          {user ? (
            <Button asChild>
              <Link to="/shipments">Go to Shipments</Link>
            </Button>
          ) : (
            <div className="flex gap-4">
              <Button asChild variant="outline" size="lg" className='bg-black text-white' >
                  <Link to="/signin">
                    Sign In <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              {/* <Button asChild>
                <Link to="/signup">Sign Up</Link>
              </Button> */}
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1 
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Streamline Your Coal Transportation Operations
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-600 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            A comprehensive logistics management platform designed for the transport industry. Manage transporters, vehicles, shipments and more from a single dashboard.
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {user ? (
              <Button asChild size="lg">
                <Link to="/shipments">
                  Go to Shipments <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <>
                {/* <Button asChild size="lg">
                  <Link to="/signup">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button> */}
                <Button asChild variant="outline" size="lg" className='bg-black text-white' >
                  <Link to="/signin">
                    Sign In <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <motion.div 
            className="bg-white p-6 rounded-lg shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Truck className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Transporter Management</h3>
            <p className="text-gray-600">Easily manage all your transporters, tracking their performance and reliability.</p>
          </motion.div>
          
          <motion.div 
            className="bg-white p-6 rounded-lg shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <BarChart3 className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
            <p className="text-gray-600">Gain valuable insights with comprehensive dashboards and detailed reports.</p>
          </motion.div>
          
          <motion.div 
            className="bg-white p-6 rounded-lg shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Shield className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
            <p className="text-gray-600">Built with industry-leading security standards to keep your data safe and accessible.</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6" />
                <h2 className="text-xl font-bold">Transport</h2>
              </div>
              <p className="mt-2 text-gray-400">Streamlining transportation operations</p>
            </div>
            
            <div className="flex gap-8">
              <div>
                <h3 className="font-semibold mb-2">Platform</h3>
                <ul className="space-y-1">
                  {/* <li><Link to="/signup" className="text-gray-400 hover:text-white">Sign Up</Link></li> */}
                  <li><Link to="/signin" className="text-gray-400 hover:text-white">Sign In</Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Legal</h3>
                <ul className="space-y-1">
                  <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Terms of Service</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>© {new Date().getFullYear()} Transport. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
