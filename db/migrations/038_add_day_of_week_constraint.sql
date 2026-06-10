-- Add CHECK constraint for day_of_week (1=Monday, 7=Sunday)
ALTER TABLE doctor_availability 
  DROP CONSTRAINT IF EXISTS check_day_of_week_range;
ALTER TABLE doctor_availability 
  ADD CONSTRAINT check_day_of_week_range 
  CHECK (day_of_week >= 1 AND day_of_week <= 7);
