import { CreateAccountForm } from '@/components/admin/create-account-form'

export default function CreateNewAccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1b62]">Create New Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Provision a new user account and assign its role.
        </p>
      </div>

      <CreateAccountForm />
    </div>
  )
}
