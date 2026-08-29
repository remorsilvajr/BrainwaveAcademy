// TODO: submit via a Server Action that creates the auth.users record
// (Supabase Admin API — needs the service role key, server-side only)
// then inserts the matching `profiles` row.

export default function CreateNewAccountPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">Create New Account</h1>

      <form className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Upload Profile Photo (optional)</label>
          <input type="file" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">First Name</label>
          <input className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Last Name</label>
          <input className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Email Address</label>
          <input type="email" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone Number (optional)</label>
          <input className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Account Role</label>
          <select className="w-full border rounded px-3 py-2">
            <option value="">Select</option>
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="autogen" defaultChecked />
          <label htmlFor="autogen" className="text-sm">Auto-generate Password</label>
        </div>

        <button type="submit" className="bg-gray-900 text-white rounded px-4 py-2">
          Create Account
        </button>
      </form>
    </div>
  )
}
