
-- Enable Row Level Security for all public tables
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create policies for vehicles table
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin users can manage vehicles" ON public.vehicles
  FOR ALL TO authenticated 
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Create policies for shipments table
CREATE POLICY "Authenticated users can view shipments" ON public.shipments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin users can manage shipments" ON public.shipments
  FOR ALL TO authenticated 
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Create policies for packages table
CREATE POLICY "Users can view assigned packages" ON public.packages
  FOR SELECT TO authenticated 
  USING (
    public.get_current_user_role() = 'admin' OR 
    auth.uid() = created_by_id OR
    auth.uid() = ANY(SELECT unnest((SELECT assigned_packages FROM public.profiles WHERE id = auth.uid())))
  );

CREATE POLICY "Admin and package creators can manage packages" ON public.packages
  FOR ALL TO authenticated 
  USING (public.get_current_user_role() = 'admin' OR auth.uid() = created_by_id)
  WITH CHECK (public.get_current_user_role() = 'admin' OR auth.uid() = created_by_id);

-- Create policies for materials table
CREATE POLICY "Authenticated users can view materials" ON public.materials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin users can manage materials" ON public.materials
  FOR ALL TO authenticated 
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admin users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin users can manage all profiles" ON public.profiles
  FOR ALL TO authenticated 
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Create policies for user_settings table
CREATE POLICY "Users can manage their own settings" ON public.user_settings
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for routes table
CREATE POLICY "Authenticated users can view routes" ON public.routes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin users can manage routes" ON public.routes
  FOR ALL TO authenticated 
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Create policies for transporters table
CREATE POLICY "Authenticated users can view transporters" ON public.transporters
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin users can manage transporters" ON public.transporters
  FOR ALL TO authenticated 
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');
