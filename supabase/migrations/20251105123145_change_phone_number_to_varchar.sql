-- Change phone_number from INTEGER to VARCHAR to support large phone numbers
ALTER TABLE public.contacts 
ALTER COLUMN phone_number TYPE VARCHAR(50);

