-- What a cashier may do in the database: the cash desk in Payments and nothing else.
-- Reads: payments, the adjustment history, wallets, top-up requests, the wallet ledger,
-- and the students, parent links and parent profiles needed to label them.
-- Writes: record a cash payment (an already-paid cash row), mark an unpaid fee paid,
-- and decide a wallet top-up request (which credits the wallet). No deletes, and no
-- fee corrections or wallet adjustments (those stay admin-only, in the app and in the
-- guard triggers of the next file).

create policy cashiers_view_payments on public.payments
  for select to public
  using (public.auth_role() = 'cashier');

create policy cashiers_record_cash_payments on public.payments
  for insert to public
  with check (public.auth_role() = 'cashier' and status = 'paid' and payment_method = 'cash');

create policy cashiers_mark_fees_paid on public.payments
  for update to public
  using (public.auth_role() = 'cashier')
  with check (public.auth_role() = 'cashier');

create policy cashiers_view_payment_adjustments on public.payment_adjustments
  for select to public
  using (public.auth_role() = 'cashier');

create policy cashiers_view_wallets on public.wallets
  for select to public
  using (public.auth_role() = 'cashier');

create policy cashiers_credit_wallets on public.wallets
  for update to public
  using (public.auth_role() = 'cashier')
  with check (public.auth_role() = 'cashier');

create policy cashiers_view_wallet_requests on public.wallet_requests
  for select to public
  using (public.auth_role() = 'cashier');

create policy cashiers_decide_wallet_requests on public.wallet_requests
  for update to public
  using (public.auth_role() = 'cashier')
  with check (public.auth_role() = 'cashier');

create policy cashiers_view_wallet_transactions on public.wallet_transactions
  for select to public
  using (public.auth_role() = 'cashier');

create policy cashiers_view_students on public.students
  for select to public
  using (public.auth_role() = 'cashier');

create policy cashiers_view_parent_links on public.parent_student
  for select to public
  using (public.auth_role() = 'cashier');

create policy cashiers_view_parent_profiles on public.profiles
  for select to public
  using (public.auth_role() = 'cashier' and role = 'parent');
