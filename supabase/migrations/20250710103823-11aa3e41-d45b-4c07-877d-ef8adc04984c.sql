
-- Add unique constraint to vehicle_number column in vehicles table
ALTER TABLE public.vehicles 
ADD CONSTRAINT vehicles_vehicle_number_unique UNIQUE (vehicle_number);
