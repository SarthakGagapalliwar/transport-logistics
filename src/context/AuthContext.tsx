import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// User types
export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
  active?: boolean; // Added active status to the user interface
}

// Auth context type
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  createUser: (email: string, password: string, username: string, role: UserRole) => Promise<boolean>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state from Supabase session
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      // Check for existing session
      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        await setUserFromSession(data.session);
      }
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            await setUserFromSession(session);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        }
      );
      
      setLoading(false);
      
      // Cleanup subscription
      return () => {
        subscription.unsubscribe();
      };
    };
    
    initializeAuth();
  }, []);

  // Helper to convert Supabase user to our app user
  const setUserFromSession = useCallback(async (session: Session) => {
    const supabaseUser = session.user;
    
    if (!supabaseUser) return;
    
    // Fetch user role from profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('role, username, active')
      .eq('id', supabaseUser.id)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return;
    }
    
    // Set user with data from auth and profile
    setUser({
      id: supabaseUser.id,
      username: data?.username || supabaseUser.email?.split('@')[0] || 'user',
      role: (data?.role as UserRole) || 'user',
      email: supabaseUser.email,
      active: data?.active // Add active status from profile data
    });
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      // Don't trim or transform email to avoid validation issues
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return false;
      }
      
      if (data?.user) {
        toast.success(`Welcome back!`);
        setLoading(false);
        return true;
      }
      
      setLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred during login');
      setLoading(false);
      return false;
    }
  }, []);

  // Signup function
  const signup = async (email: string, password: string, username: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      
      // 1. Register user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          },
          emailRedirectTo: window.location.origin + '/signin'
        }
      });
      
      if (error) {
        console.error('Signup error:', error);
        toast.error(error.message);
        setLoading(false);
        return false;
      }
      
      if (data?.user) {
        // The trigger should automatically create the profile
        toast.success('Account created successfully! Please verify your email.');
        setLoading(false);
        return true;
      }
      
      setLoading(false);
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An unexpected error occurred during signup');
      setLoading(false);
      return false;
    }
  };

  // Create user function (for admin use)
  const createUser = async (email: string, password: string, username: string, role: UserRole): Promise<boolean> => {
    try {
      // Use the edge function to create the user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: JSON.stringify({
          email,
          password,
          username,
          role
        })
      });
      
      if (error || !data?.success) {
        console.error('User creation error:', error || data?.error);
        throw error || new Error(data?.error || 'Failed to create user');
      }
      
      if (data?.user) {
        console.log('User created successfully:', data.user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('User creation error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error('Error signing out');
      setLoading(false);
      return;
    }
    
    setUser(null);
    setLoading(false);
    toast.info('You have been logged out');
    navigate('/signin');
  }, [navigate]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    createUser
  }), [user, loading, login, signup, logout, createUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
