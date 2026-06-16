-- Admin account setup for Barangay Bato e-Certificate System
-- 1. Register an account through /register using the real admin email.
-- 2. Confirm the email in Supabase Auth if email confirmation is enabled.
-- 3. Replace the placeholder email below, then run this SQL in Supabase SQL Editor.

-- Use role 'main_admin' for the Main Admin account.
update public.profiles
set role = 'main_admin',
    updated_at = now()
where email = 'admin@example.com';

-- Optional Barangay Secretary promotion after that account is registered.
-- update public.profiles
-- set role = 'barangay_secretary',
--     updated_at = now()
-- where email = 'secretary@example.com';

-- Verify:
select id, full_name, email, role
from public.profiles
where email = 'admin@example.com';
