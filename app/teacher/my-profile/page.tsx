export default function TeacherMyProfilePage() {
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">My Profile</h1>

      <div className="border rounded-lg p-4 space-y-1">
        <p className="text-sm text-gray-500">Account ID</p>
        <p className="font-medium">TCH-2026-0001</p>
        <p className="text-sm text-gray-500 mt-2">Status</p>
        <p className="font-medium">Verified</p>
      </div>

      <div>
        <label className="block text-sm mb-1 text-gray-500">Full Name</label>
        <input disabled value="Maria Santos" className="w-full border rounded px-3 py-2 bg-gray-100" />
      </div>

      <div>
        <label className="block text-sm mb-1 text-gray-500">Email Address</label>
        <input disabled value="maria.santos@school.com" className="w-full border rounded px-3 py-2 bg-gray-100" />
      </div>

      <form className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Phone Number</label>
          <input className="w-full border rounded px-3 py-2" />
        </div>

        <button type="submit" className="bg-gray-900 text-white rounded px-4 py-2">
          Save Changes
        </button>
      </form>
    </div>
  )
}
