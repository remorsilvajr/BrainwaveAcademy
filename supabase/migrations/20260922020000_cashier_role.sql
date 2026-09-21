-- A new account role for the cash desk. Run this on its own and let it commit before the
-- policies file: a new enum value cannot be used in the same transaction that adds it.
alter type public.user_role add value if not exists 'cashier';
