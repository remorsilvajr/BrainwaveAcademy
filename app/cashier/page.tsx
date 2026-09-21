import { redirect } from 'next/navigation'

// The cashier's only working area is Payments.
export default function CashierHomePage() {
  redirect('/cashier/payments')
}
